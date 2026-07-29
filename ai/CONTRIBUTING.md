# 文档维护规程

> **版本**：v1 (2026-07-16)
> **目标**：确保文档与代码同步更新，保持一致性。

---

## 一、文档更新触发条件

| 变更类型 | 需更新的文档 | 负责人 |
|----------|-------------|--------|
| **新增功能** | README.md、对应功能文档、CHANGELOG | 开发者 |
| **API 变更** | api-reference.md、sdk.md | 开发者 |
| **架构调整** | architecture.md、相关设计文档 | 架构师 |
| **配置变更** | environment-variables.md、plugin.md | 开发者 |
| **Bug 修复** | CHANGELOG（如影响用户） | 开发者 |
| **依赖升级** | README.md（如影响安装） | 开发者 |

---

## 二、文档目录结构

```
ai/docs/
├── README.md                    # 文档索引与快速开始
├── architecture.md              # 架构总览
├── agent.md                     # Chat Agent 系统
├── agent-workflow.md            # 工作流编排
├── tool.md                      # 工具系统
├── mcp.md                       # MCP 协议
├── events.md                    # 事件协议
├── ai-shared.md                 # 共享包 API
├── plugin.md                    # 插件中心
├── sdk.md                       # SDK 与集成
├── environment-variables.md     # 环境变量清单
├── platform.md                  # 平台定位
├── design/                      # 设计文档
│   ├── README.md
│   ├── chat.md
│   ├── workflows.md
│   ├── rag.md
│   └── runtime.md
├── product/                     # 产品规划
│   ├── backlog.md
│   ├── open-platform-roadmap.md
│   └── open-source-iteration.md
└── extend/                      # 扩展指南
    ├── skill-author-guide.md
    ├── workflow-template-rfc.md
    └── workflow-variables.md
```

---

## 三、更新流程

### 3.1 开发者

1. **代码变更时**：同步更新对应文档
2. **PR 审查时**：检查文档是否更新
3. **合并前**：确保文档与代码一致

### 3.2 架构师

1. **架构变更时**：更新 architecture.md 和相关设计文档
2. **定期审查**：每季度审查文档完整性
3. **技术决策**：记录在 ADR（Architecture Decision Records）

### 3.3 产品经理

1. **功能规划时**：更新 product/ 目录下的规划文档
2. **需求变更时**：更新对应功能文档
3. **发布前**：审查用户文档

---

## 四、文档质量标准

### 4.1 格式规范

- 使用 Markdown 格式
- 标题层级清晰（H1 → H2 → H3）
- 代码块使用语法高亮
- 表格对齐整齐
- 链接可访问

### 4.2 内容规范

- **准确性**：与代码实现一致
- **完整性**：覆盖所有功能点
- **清晰性**：语言简洁明了
- **示例性**：提供代码示例
- **时效性**：标注最后更新时间

### 4.3 命名规范

- 文件名：小写 + 连字符（`agent-workflow.md`）
- 标题：首字母大写（`## Agent Workflow`）
- 代码：使用反引号（`pluginExpert`）

---

## 五、文档审查清单

### PR 审查时

- [ ] 新功能是否有对应文档
- [ ] API 变更是否更新 api-reference
- [ ] 配置变更是否更新 environment-variables
- [ ] 示例代码是否可运行
- [ ] 链接是否有效

### 发布前

- [ ] README.md 是否更新版本号
- [ ] CHANGELOG 是否记录所有变更
- [ ] 快速开始是否可执行
- [ ] 文档目录是否完整

---

## 六、文档工具

### 6.1 链接检查

```bash
# 检查 Markdown 链接
find ai/docs -name "*.md" -exec grep -H "\[.*\](.*)" {} \;
```

### 6.2 拼写检查

```bash
# 使用 cspell
npx cspell "ai/docs/**/*.md"
```

### 6.3 格式检查

```bash
# 使用 markdownlint
npx markdownlint "ai/docs/**/*.md"
```

---

## 七、文档版本管理

### 7.1 版本号

- **主版本号**：架构重大变更
- **次版本号**：功能新增
- **修订号**：Bug 修复、文档修正

### 7.2 变更记录

在文档顶部添加版本信息：

```markdown
> **版本**：v2.1 (2026-07-16)
> **变更**：新增 MCP Server 配置说明
```

---

## 八、常见问题

### Q: 文档与代码不一致怎么办？

A: 以代码为准，更新文档。如果代码有误，先修复代码再更新文档。

### Q: 如何处理废弃功能？

A: 在文档中标注 `**已废弃**`，说明替代方案，并在 CHANGELOG 中记录。

### Q: 外部文档（README.md）与内部文档（docs/）如何分工？

A: README.md 面向用户，提供快速开始和基本使用；docs/ 面向开发者，提供详细技术文档。

---

## 九、文档维护检查表

### 每月检查

- [ ] 链接有效性
- [ ] 示例代码可运行性
- [ ] 环境变量完整性
- [ ] API 文档准确性

### 每季度检查

- [ ] 架构文档与代码一致性
- [ ] 废弃功能清理
- [ ] 文档目录结构合理性
- [ ] 文档覆盖率

---

## 十、联系方式

- **文档问题**：GitHub Issues
- **技术讨论**：GitHub Discussions
- **紧急问题**：联系维护者

---

**最后更新**：2026-07-16
