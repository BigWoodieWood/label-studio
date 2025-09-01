### Parameters

| Param | Type | Description |
| --- | --- | --- |
| name | <code>string</code> | Name of the element |
| value | <code>string</code> | Data field containing an array of chat messages or empty array |
| [messageroles] | <code>string</code> | Comma-separated list of roles allowed to compose (default: "user" if `llm` is set and "user,assistant" if not) |
| [editable] | <code>boolean</code> \| <code>string</code> | Whether messages are editable. Use true/false, or a comma-separated list of roles that are editable |
| [minmessages] | <code>string</code> \| <code>number</code> | Minimum total number of messages required to submit |
| [maxmessages] | <code>string</code> \| <code>number</code> | Maximum total number of messages allowed |
| [llm] | <code>string</code> | Model used to enable automatic assistant replies, format: `<provider>/<model>` |

