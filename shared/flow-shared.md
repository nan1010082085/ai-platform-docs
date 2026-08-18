# flow-shared

`@schema-platform/flow-shared` — 流程引擎共享层，为 Flow 和 Server 提供流程定义、校验和执行能力。

## 目录结构

```
shared/flow-shared/
├── src/
│   ├── types/              # 类型定义
│   │   ├── flow.ts         # 流程定义类型
│   │   ├── node.ts         # 节点类型
│   │   └── execution.ts    # 执行类型
│   ├── engine/             # FlowEngine 执行引擎
│   │   ├── FlowEngine.ts   # 引擎核心
│   │   ├── Token.ts        # Token 模型
│   │   └── nodes/          # 节点处理器
│   ├── validator/          # 流程校验
│   │   ├── FlowValidator.ts # 校验器
│   │   └── rules/          # 校验规则
│   ├── serializer/         # 序列化
│   │   ├── FlowSerializer.ts # 序列化器
│   │   └── FlowDeserializer.ts # 反序列化器
│   └── utils/              # 工具函数
│       ├── graph.ts        # 图算法
│       └── condition.ts    # 条件表达式
├── package.json
└── tsconfig.json
```

## 核心模块

### FlowEngine 执行引擎

```typescript
import { FlowEngine } from '@schema-platform/flow-shared'

const engine = new FlowEngine(flowDefinition)
const result = await engine.execute({
  variables: { applicant: 'zhangsan' },
})
```

### Token 模型

流程实例 Token 驱动执行：

```
StartEvent → UserTask → ExclusiveGateway → ServiceTask → EndEvent
    │              │           │
    └── Token ─────┘           └── Token ──→ 下一节点
```

### 流程校验

```typescript
import { FlowValidator } from '@schema-platform/flow-shared'

const validator = new FlowValidator(flowDefinition)
const errors = validator.validate()

if (errors.length > 0) {
  console.error('流程校验失败:', errors)
}
```

### 流程序列化

```typescript
import { FlowSerializer, FlowDeserializer } from '@schema-platform/flow-shared'

// Vue Flow nodes/edges ↔ FlowGraph JSON
const flowGraph = FlowSerializer.serialize(nodes, edges)
const { nodes, edges } = FlowDeserializer.deserialize(flowGraph)
```

## 节点类型

| 节点 | 处理器 | 说明 |
|------|--------|------|
| StartEvent | StartEventNode | 流程开始 |
| EndEvent | EndEventNode | 流程结束 |
| UserTask | UserTaskNode | 人工审批任务 |
| ServiceTask | ServiceTaskNode | 自动服务任务 |
| ExclusiveGateway | ExclusiveGatewayNode | 排他网关（条件分支） |
| ParallelGateway | ParallelGatewayNode | 并行网关（多分支并行） |
| SubProcess | SubProcessNode | 子流程 |

## 消费方式

### 同仓开发（推荐）

```json
{
  "dependencies": {
    "@schema-platform/flow-shared": "file:../shared/flow-shared"
  }
}
```

### npm 发布

```bash
# 发布到 GitHub Packages
cd shared/flow-shared
npm publish
```

## 消费者

| 子项目 | 用途 |
|--------|------|
| Flow | 流程设计器、模拟执行、流程校验 |
| Server | 流程执行引擎、实例管理 |

## 相关文档

| 文档 | 说明 |
|------|------|
| [Flow 架构](/flow/architecture) | 分层、flow-shared 边界、Store |
| [Flow 运行时](/flow/design/runtime) | FlowEngine、Token 模型、服务端执行 |
| [platform-shared](./platform-shared) | 平台公共组件/工具 |
| [ai-shared](/ai/ai-shared) | AI 共享层 API |
