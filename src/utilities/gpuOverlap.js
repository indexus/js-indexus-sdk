const WORKGROUP_SIZE = 64;
const PARAMS_BYTE_SIZE = 32;

const SHADER_CODE = `
struct Params {
  viewport: vec4<f32>,
  count: u32,
  _pad0: u32,
  _pad1: u32,
  _pad2: u32,
};

@group(0) @binding(0) var<storage, read> boundsIn: array<vec4<f32>>;
@group(0) @binding(1) var<uniform> params: Params;
@group(0) @binding(2) var<storage, read_write> flagsOut: array<u32>;

@compute @workgroup_size(${WORKGROUP_SIZE})
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i = gid.x;
  if (i >= params.count) {
    return;
  }

  let b = boundsIn[i];
  let overlap =
    params.viewport.x <= b.y &&
    params.viewport.y >= b.x &&
    params.viewport.z <= b.w &&
    params.viewport.w >= b.z;

  flagsOut[i] = select(0u, 1u, overlap);
}
`;

function getSphericalSegment(segments) {
  if (!Array.isArray(segments) || segments.length !== 1) return null;
  const segment = segments[0];
  if (!segment) return null;
  if (
    !Number.isFinite(segment.south) ||
    !Number.isFinite(segment.north) ||
    !Number.isFinite(segment.west) ||
    !Number.isFinite(segment.east)
  ) {
    return null;
  }
  return segment;
}

function wrapsDateline(segment) {
  return segment.west > segment.east;
}

function isWebGpuAvailable() {
  return (
    typeof navigator !== "undefined" &&
    navigator &&
    typeof navigator.gpu !== "undefined" &&
    typeof GPUBufferUsage !== "undefined"
  );
}

function nextPowerOfTwo(value) {
  let n = Math.max(1, Math.floor(value));
  n--;
  n |= n >> 1;
  n |= n >> 2;
  n |= n >> 4;
  n |= n >> 8;
  n |= n >> 16;
  return n + 1;
}

class GpuOverlapAccelerator {
  constructor({ enabled = true, minElements = 1024 } = {}) {
    this.enabled = enabled;
    this.minElements = minElements;
    this.failed = false;
    this.initPromise = null;
    this.device = null;
    this.pipeline = null;
    this.bindGroupLayout = null;
    this.bindGroup = null;
    this.boundsBuffer = null;
    this.boundsCapacityBytes = 0;
    this.paramsBuffer = null;
    this.flagsBuffer = null;
    this.readBuffer = null;
    this.flagsCapacity = 0;
    this.flagsScratch = new Uint32Array(0);
    this.params = new ArrayBuffer(PARAMS_BYTE_SIZE);
    this.paramsView = new DataView(this.params);
  }

  async selectOverlapping(targetBounds, candidates, selected) {
    if (!this.enabled || this.failed) return false;
    if (!Array.isArray(candidates) || candidates.length < this.minElements) {
      return false;
    }

    const viewport = getSphericalSegment(targetBounds);
    if (!viewport || wrapsDateline(viewport)) return false;

    const cellCount = candidates.length;
    const packedBounds = new Float32Array(cellCount * 4);
    for (let i = 0; i < cellCount; i++) {
      const candidate = candidates[i];
      const segment = getSphericalSegment(candidate && candidate._bounds);
      if (!segment || wrapsDateline(segment)) return false;
      const offset = i * 4;
      packedBounds[offset] = segment.south;
      packedBounds[offset + 1] = segment.north;
      packedBounds[offset + 2] = segment.west;
      packedBounds[offset + 3] = segment.east;
    }

    const contextReady = await this.ensureContext();
    if (!contextReady) return false;

    try {
      const flags = await this.runKernel(viewport, packedBounds, cellCount);
      for (let i = 0; i < cellCount; i++) {
        if (flags[i] === 1) selected.push(candidates[i]);
      }
      return true;
    } catch (_error) {
      this.failed = true;
      return false;
    }
  }

  async ensureContext() {
    if (this.device && this.pipeline && this.bindGroupLayout) return true;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      if (!isWebGpuAvailable()) return false;
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) return false;
      const device = await adapter.requestDevice();
      const module = device.createShaderModule({ code: SHADER_CODE });
      const bindGroupLayout = device.createBindGroupLayout({
        entries: [
          {
            binding: 0,
            visibility: GPUShaderStage.COMPUTE,
            buffer: { type: "read-only-storage" },
          },
          {
            binding: 1,
            visibility: GPUShaderStage.COMPUTE,
            buffer: { type: "uniform" },
          },
          {
            binding: 2,
            visibility: GPUShaderStage.COMPUTE,
            buffer: { type: "storage" },
          },
        ],
      });
      const pipelineLayout = device.createPipelineLayout({
        bindGroupLayouts: [bindGroupLayout],
      });
      const pipeline = device.createComputePipeline({
        layout: pipelineLayout,
        compute: {
          module,
          entryPoint: "main",
        },
      });
      const paramsBuffer = device.createBuffer({
        size: PARAMS_BYTE_SIZE,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });

      this.device = device;
      this.pipeline = pipeline;
      this.bindGroupLayout = bindGroupLayout;
      this.paramsBuffer = paramsBuffer;
      return true;
    })();

    const ready = await this.initPromise;
    if (!ready) this.initPromise = null;
    return ready;
  }

  async runKernel(viewport, packedBounds, count) {
    const device = this.device;
    const boundsByteSize = packedBounds.byteLength;
    this.ensureBuffers(boundsByteSize, count);

    this.paramsView.setFloat32(0, viewport.south, true);
    this.paramsView.setFloat32(4, viewport.north, true);
    this.paramsView.setFloat32(8, viewport.west, true);
    this.paramsView.setFloat32(12, viewport.east, true);
    this.paramsView.setUint32(16, count, true);

    device.queue.writeBuffer(this.boundsBuffer, 0, packedBounds);
    device.queue.writeBuffer(this.paramsBuffer, 0, this.params);

    const encoder = device.createCommandEncoder();
    const pass = encoder.beginComputePass();
    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.bindGroup);
    pass.dispatchWorkgroups(Math.ceil(count / WORKGROUP_SIZE));
    pass.end();
    encoder.copyBufferToBuffer(
      this.flagsBuffer,
      0,
      this.readBuffer,
      0,
      count * Uint32Array.BYTES_PER_ELEMENT
    );
    device.queue.submit([encoder.finish()]);

    await this.readBuffer.mapAsync(GPUMapMode.READ);
    const mapped = this.readBuffer.getMappedRange(
      0,
      count * Uint32Array.BYTES_PER_ELEMENT
    );
    if (this.flagsScratch.length < count) {
      this.flagsScratch = new Uint32Array(nextPowerOfTwo(count));
    }
    this.flagsScratch.set(new Uint32Array(mapped), 0);
    this.readBuffer.unmap();

    return this.flagsScratch.subarray(0, count);
  }

  ensureBuffers(boundsByteSize, count) {
    const device = this.device;
    const requestedBoundsBytes = nextPowerOfTwo(boundsByteSize);
    const requestedFlags = nextPowerOfTwo(count);
    const requestedFlagsBytes = requestedFlags * Uint32Array.BYTES_PER_ELEMENT;

    let rebuildBindGroup = false;

    if (!this.boundsBuffer || this.boundsCapacityBytes < requestedBoundsBytes) {
      if (this.boundsBuffer) this.boundsBuffer.destroy();
      this.boundsBuffer = device.createBuffer({
        size: requestedBoundsBytes,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      });
      this.boundsCapacityBytes = requestedBoundsBytes;
      rebuildBindGroup = true;
    }

    if (!this.flagsBuffer || this.flagsCapacity < requestedFlags) {
      if (this.flagsBuffer) this.flagsBuffer.destroy();
      if (this.readBuffer) this.readBuffer.destroy();
      this.flagsBuffer = device.createBuffer({
        size: requestedFlagsBytes,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
      });
      this.readBuffer = device.createBuffer({
        size: requestedFlagsBytes,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
      });
      this.flagsCapacity = requestedFlags;
      rebuildBindGroup = true;
    }

    if (!this.bindGroup || rebuildBindGroup) {
      this.bindGroup = device.createBindGroup({
        layout: this.bindGroupLayout,
        entries: [
          { binding: 0, resource: { buffer: this.boundsBuffer } },
          { binding: 1, resource: { buffer: this.paramsBuffer } },
          { binding: 2, resource: { buffer: this.flagsBuffer } },
        ],
      });
    }
  }
}

export function createGpuOverlapAccelerator(options) {
  return new GpuOverlapAccelerator(options);
}
