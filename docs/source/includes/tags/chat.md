### Parameters

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| name | <code>string</code> |  | Name of the element |
| value | <code>string</code> |  | Data field containing an array of chat messages with 'role', 'content', and optional 'timestamp' fields |
| [llm] | <code>string</code> |  | LLM model identifier for AI-assisted conversation continuation (e.g., "gpt-5") |
| [messageRoles] | <code>string</code> | <code>&quot;user,assistant&quot;</code> | Comma or pipe-separated list of available message roles for new messages |
| [minMessages] | <code>string</code> |  | Minimum number of messages required for annotation completion |
| [maxMessages] | <code>string</code> |  | Maximum number of messages allowed in the conversation |

### Result parameters

| Name | Type | Description |
| --- | --- | --- |
| value | <code>Object</code> |  |
| value.chatmessage.role | <code>string</code> | role of the message (user, assistant, system) |
| value.chatmessage.content | <code>string</code> | content of the message |
| value.chatmessage.timestamp | <code>number</code> | timestamp of the message (ms) |

### Example JSON
```json
{
  "value": {
    "chatmessage": {
      "role": "user",
      "content": "Hello, how are you?",
      "timestamp": 1755872989436
    }
  }
}
```

