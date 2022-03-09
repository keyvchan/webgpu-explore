if (!navigator.gpu) throw Error("GPU not supported");

const adapter = await navigator.gpu.requestAdapter();
if (!adapter) throw Error("GPU adapter not available");

const device = await adapter.requestDevice();
if (!device) throw Error("GPU device not available");

const module = device.createShaderModule({
  code: `
  @stage(compute) @workgroup_size(64)
  fn main() {
    
  }
`,
});

const bindGroupLayout = device.createBindGroupLayout({
  entries: [
    {
      binding: 1,
      visibility: GPUShaderStage.COMPUTE,
      buffer: {
        type: "storage",
      },
    },
  ],
});

const pipeline = device.createComputePipeline({
  layout: device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
  compute: {
    module,
    entryPoint: "main",
  },
});

const BUFER_SIZE = 1024;
const output = device.createBuffer({
  size: BUFER_SIZE,
  usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
});
const stagingBuffer = device.createBuffer({
  size: BUFER_SIZE,
  usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
});
const bindGroup = device.createBindGroup({
  layout: bindGroupLayout,
  entries: [
    {
      binding: 1,
      resource: {
        buffer: output,
      },
    },
  ],
});

const commandEncoder = device.createCommandEncoder();
const passEncoder = commandEncoder.beginComputePass();
passEncoder.setPipeline(pipeline);
passEncoder.setBindGroup(0, bindGroup);
passEncoder.dispatch(Math.ceil(BUFER_SIZE / 64), 1, 1);
passEncoder.endPass();
commandEncoder.copyBufferToBuffer(output, 0, stagingBuffer, 0, BUFER_SIZE);
const commands = commandEncoder.finish();
device.queue.submit([commands]);

await stagingBuffer.mapAsync(GPUMapMode.READ, 0, BUFER_SIZE);
const copyArrayBuffer = stagingBuffer.getMappedRange(0, BUFER_SIZE);
const data = copyArrayBuffer.slice(0);
stagingBuffer.unmap();
console.log(new Float32Array(data));
