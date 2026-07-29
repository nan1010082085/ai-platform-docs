# Editor 实例与发布 — 设计稿与交互流

## 一、实例列表线框（InstancesView）

```
┌──────────────────────────────────────────────────────────────────────────┐
│ 表单实例                              [+ 新建] [导入] [导出]              │
├──────────────────────────────────────────────────────────────────────────┤
│ 🔍 搜索...     筛选: [全部▾] [草稿] [已发布]                             │
├──────────────────────────────────────────────────────────────────────────┤
│  名称          状态      更新时间        操作                             │
│  用户注册表单   已发布    2小时前    [设计] [预览] [发布] [版本] [删除]    │
│  请假申请       草稿      昨天       [设计] [预览] [发布] ...             │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 二、列表操作交互流

```mermaid
flowchart TD
  subgraph actions [行操作]
    Design["设计 → /editor?id="]
    Preview["预览 → /preview?id="]
    Publish["发布 → publishSchema API"]
    Version["版本 → VersionHistoryDialog"]
    Delete["删除 → confirmDanger"]
  end

  subgraph create [新建]
    New["新建对话框"] --> Template["选择板型模板"]
    Template --> Board["boardTemplates 初始化 canvas"]
    Board --> Editor["跳转 /editor 无 id"]
  end
```

### 发布（从列表）

```mermaid
sequenceDiagram
  participant List as InstancesView
  participant API as schemaApi
  List->>API: publishSchema(schemaId)
  API-->>List: publishId, status=published
  List->>List: 刷新列表状态
```

---

## 三、发布运行时线框（PublishView）

```
┌──────────────────────────────────────────────────────────────────────────┐
│ [可选顶栏] 表单标题                                    mode: edit/view    │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│                    WidgetRenderer (runtime surface)                      │
│                    表单字段渲染 + 联动 + 校验                              │
│                                                                          │
├──────────────────────────────────────────────────────────────────────────┤
│ [提交] [重置]                                                            │
└──────────────────────────────────────────────────────────────────────────┘
```

### 访问方式

| URL | 加载 API |
|-----|----------|
| `/view/:schemaCode` | `fetchPublishedByCode` |
| `/view?id=publishId` | `fetchPublishedByPublishId` |

---

## 四、postMessage 嵌入协议

外部宿主（Flow UserTask、微前端容器）通过 iframe 嵌入 PublishView：

```mermaid
sequenceDiagram
  participant Host as 宿主 (Flow)
  participant Iframe as PublishView
  participant WR as WidgetRenderer

  Host->>Iframe: fg:set-mode { mode: edit|view }
  Host->>Iframe: fg:set-context { variables }
  Host->>Iframe: fg:set-data { field: value }
  Host->>Iframe: fg:set-schema (可选覆盖)

  Host->>Iframe: fg:get-data
  Iframe->>WR: getData()
  Iframe-->>Host: { data }

  Host->>Iframe: fg:validate
  Iframe->>WR: validate()
  Iframe-->>Host: { valid, errors }

  Host->>Iframe: fg:submit
  Iframe->>WR: submit → createSubmission API
  Iframe-->>Host: { success, submissionId }
```

| 消息 | 方向 | 说明 |
|------|------|------|
| `fg:set-mode` | Host → Editor | 编辑/只读/部分可编辑 |
| `fg:set-context` | Host → Editor | 注入流程变量 |
| `fg:set-data` | Host → Editor | 预填表单数据 |
| `fg:get-data` | Host → Editor | 读取当前表单值 |
| `fg:validate` | Host → Editor | 触发字段校验 |
| `fg:submit` | Host → Editor | 提交到 server |
| `fg:reset` | Host → Editor | 重置表单 |

实现：`editor/src/microapp/bridge.ts` + `PublishView.vue`。

---

## 五、草稿预览（PreviewRenderView）

```mermaid
flowchart LR
  Open["/preview?id="] --> Fetch["fetchSchemaById"]
  Fetch --> Parse["parseSchemaJson"]
  Parse --> Render["WidgetRenderer layout=absolute"]
```

与 PublishView 差异：加载**草稿** API，无提交发布约束。

---

## 六、版本管理

```mermaid
flowchart TD
  Open["VersionHistoryDialog"] --> List["listVersions(schemaId)"]
  List --> Actions{操作}
  Actions --> View["查看快照（只读）"]
  Actions --> Rollback["回滚到版本 → 加载到设计器"]
  Actions --> PubVer["发布指定版本"]
  Actions --> Compare["VersionCompare 差异对比"]
```

查询参数 `?editId=&version=` 可直接打开历史版本编辑。

---

## 七、提交流程（运行时）

```mermaid
sequenceDiagram
  participant User as 终端用户
  participant PV as PublishView
  participant WR as WidgetRenderer
  participant API as dataApi

  User->>PV: 填写并提交
  PV->>WR: validate()
  alt 校验失败
    WR-->>User: 字段错误提示
  else 通过
    PV->>WR: getData()
    PV->>API: createSubmission(schemaId, data)
    API-->>User: 成功提示
  end
```

可选：事件引擎 `submit` 动作触发 `startFlow` 启动关联流程。
