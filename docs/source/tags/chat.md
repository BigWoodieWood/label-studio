---
title: Chat
type: tags
order: 302
meta_title: Chat Tag for Conversational Transcripts
meta_description: Display and extend chat transcripts; optionally request assistant replies from an LLM. Supports message editing controls and min/max limits.
---

The `Chat` tag displays a conversational transcript and lets annotators
extend it with new messages during labeling. The initial transcript is
provided from task data via the `value` attribute.

Optionally, the tag can request automatic replies from an LLM model. To do so,
set the `llm` attribute to a model in the format `<provider>/<model>`.

Messages can be edited by clicking the edit button that appears on hover for
user-created messages (messages from annotation results). System messages from
task data cannot be edited.

Use with the following data types: JSON array of message objects.

Message object format (task data):
- `role`    — speaker identifier; supported roles: `user`, `assistant`, `system`, `tool`, `developer`
- `content` — message text

{% insertmd includes/tags/chat.md %}

### Example

Allow composing both user and assistant messages; auto-reply using an LLM model

```html
 <View>
  <Chat
    name="conversation" value="$dialog"
    messageroles="user,assistant" llm="openai/gpt-5"
    minMessages="4" maxMessages="20"
    editable="user,assistant"
  />
</View>
```
### Example

Evaluate assistant responses

```html
<View>
  <Style>
    .htx-chat{flex-grow:1}
    .htx-chat-sidepanel{flex:300px 0 0;display:flex;flex-direction:column;border-left:2px solid #ccc;padding-left:16px}
  </Style>
  <View style="display:flex;width:100%;gap:1em">
    <Chat name="chat" value="$messages" llm="gpt-4.1-nano" minMessages="4" maxMessages="10" />
    <View className="htx-chat-sidepanel">
      <View style="position:sticky;top:14px">
        <!-- Invitation/explanation on how to evaluate -->
        <View visibleWhen="no-region-selected">
          <Text name="_3" value="Click on a message to rate specific parts of the conversation"/>
        </View>
        <!-- Evaluate assistant messages -->
        <View visibleWhen="region-selected" whenRole="assistant">
          <Text name="_1" value="Rate the response" />
          <Rating name="response_rating" toName="chat" perRegion="true" />
        </View>
      <!-- Evaluate the whole conversation -->
      <View style="margin-top:auto;height:130px">
        <Header size="4">Overall quality of this conversation</Header>
        <Rating name="rating" toName="chat" />
      </View>
    </View>
  </View>
</View>
```
