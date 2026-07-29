# Data Models

MongoDB is accessed via Mongoose ODM. All models live in `src/models/` (base), `src/flow-models/` (flow), `src/ai/models/` (AI).

> **Primary key**: all models use MongoDB native ObjectId as `_id`; Mongoose `toJSON` auto-converts it to a string `id` field.

## Core Models

### FormSchema

Form schema instance (the editor's main resource).

| Field | Type | Description |
|------|------|------|
| `_id` | ObjectId | Primary key |
| `name` | String | Name |
| `type` | String | `form` / `search_list` |
| `status` | String | `draft` / `published` |
| `json` | Mixed | Schema tree structure (Widget[]) |
| `publishId` | String | Published version identifier |
| `version` | String | Version number |
| `editId` | String | Edit-mode identifier |
| `tenantId` | String | Tenant ID |
| `createdAt` | Date | Created time |
| `updatedAt` | Date | Updated time |

### PublishedSchema

Published schema snapshot.

| Field | Type | Description |
|------|------|------|
| `_id` | ObjectId | Primary key |
| `sourceId` | String | Associated FormSchema ID |
| `name` | String | Name |
| `json` | Mixed | Schema snapshot |
| `publishId` | String | Unique publish identifier |
| `version` | String | Version number |
| `tenantId` | String | Tenant ID |

### WidgetTemplate

Component template library.

| Field | Type | Description |
|------|------|------|
| `_id` | ObjectId | Primary key |
| `name` | String | Template name |
| `description` | String | Description |
| `category` | String | `form` / `table` / `search` / `layout` / `chart` / `business` / `report` / `other` |
| `widgets` | Mixed[] | Widget array |
| `tags` | String[] | Tags |
| `isBuiltin` | Boolean | Whether built-in |
| `usageCount` | Number | Usage count |
| `tenantId` | String | Tenant ID |

### FormSubmission

Form submission data.

| Field | Type | Description |
|------|------|------|
| `_id` | ObjectId | Primary key |
| `schemaId` | String | Associated FormSchema ID |
| `data` | Mixed | Submitted form data |
| `status` | String | `submitted` / `approved` / `rejected` |
| `submitterId` | String | Submitter ID |
| `submitterName` | String | Submitter name |
| `tenantId` | String | Tenant ID |

## Flow Models

### FlowDefinition

Flow definition.

| Field | Type | Description |
|------|------|------|
| `_id` | ObjectId | Primary key |
| `name` | String | Flow name |
| `description` | String | Description |
| `bpmnXml` | String | BPMN XML |
| `currentVersion` | Number | Current version number |
| `status` | String | `draft` / `active` / `inactive` |
| `tenantId` | String | Tenant ID |

### FlowVersion

Flow version.

| Field | Type | Description |
|------|------|------|
| `_id` | ObjectId | Primary key |
| `definitionId` | String | Associated FlowDefinition ID |
| `version` | Number | Version number |
| `bpmnXml` | String | BPMN XML snapshot |
| `nodeConfigs` | Mixed | Node configs |
| `tenantId` | String | Tenant ID |

### FlowInstance

Flow runtime instance.

| Field | Type | Description |
|------|------|------|
| `_id` | ObjectId | Primary key |
| `flowId` | String | Associated FlowDefinition ID |
| `version` | Number | Used version number |
| `status` | String | `running` / `completed` / `cancelled` |
| `variables` | Mixed | Process variables |
| `currentNode` | String | Current node ID |
| `tenantId` | String | Tenant ID |

### TaskInstance

Task instance.

| Field | Type | Description |
|------|------|------|
| `_id` | ObjectId | Primary key |
| `instanceId` | String | Associated FlowInstance ID |
| `nodeId` | String | Node ID |
| `name` | String | Task name |
| `assignees` | String[] | Assignee list |
| `status` | String | `pending` / `claimed` / `completed` / `rejected` |
| `tenantId` | String | Tenant ID |

### ApprovalLog

Approval log.

| Field | Type | Description |
|------|------|------|
| `_id` | ObjectId | Primary key |
| `instanceId` | String | Flow instance ID |
| `nodeId` | String | Node ID |
| `action` | String | `approve` / `reject` / `delegate` |
| `operatorId` | String | Operator ID |
| `comment` | String | Approval comment |
| `tenantId` | String | Tenant ID |

## System Models

### User

User account (JWT auth).

| Field | Type | Description |
|------|------|------|
| `_id` | ObjectId | Primary key |
| `username` | String | Username (unique) |
| `password` | String | bcrypt-hashed password |
| `displayName` | String | Display name |
| `roles` | String[] | Role ID list |
| `deptId` | String | Department ID |
| `tenantId` | String | Tenant ID |
| `status` | Number | Status |

### Role / Permission

Role-permission mapping, RBAC model.

### Menu

Dynamic menu tree, supports `microAppId` binding to micro-apps. `parentId` builds the tree structure.

### DictType / DictData

Dictionary management (type + data items).

### Tenant / Dept / Post

Tenant, department, position organization.

### ModelConfig

AI model config (DeepSeek, GPT, etc.).

### AuditLog / NodeExecutionLog

Operation log, node execution log.

### Webhook / WebhookLog

Webhook config and delivery log.

### Credential

Encrypted third-party credentials.

### MicroApp

qiankun micro-frontend app registration.

## ID Validation

All route param ID validation uses `mongoose.Types.ObjectId.isValid(id)`; UUID validation is no longer used.
