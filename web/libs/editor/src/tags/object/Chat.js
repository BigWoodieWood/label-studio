// stub file to keep docs for Chat object tag

/**
 * The `Chat` tag displays a conversational chat interface for labeling LLM conversations and message exchanges. Use for conversational AI evaluation, chat flow analysis, and dialogue annotation tasks.
 *
 * The Chat tag can display existing chat transcripts from task data and allows annotators to extend conversations with new messages during annotation. Each message can be individually selected and annotated with classification controls.
 *
 * Use with the following data types: JSON arrays containing chat messages.
 * @example
 * <!--Basic chat labeling configuration -->
 * <View>
 *   <Chat name="conversation" value="$dialog" />
 *   <Choices name="message_quality" toName="conversation">
 *     <Choice value="helpful" />
 *     <Choice value="harmful" />
 *     <Choice value="neutral" />
 *   </Choices>
 * </View>
 * @example
 * <!--Chat with LLM integration and role restrictions -->
 * <View>
 *   <Chat name="chat" value="$messages"
 *         llm="gpt-5"
 *         messageRoles="user,assistant"
 *         minMessages="2"
 *         maxMessages="10" />
 *   <Rating name="message_quality" toName="chat" perRegion="true" />
 * </View>
 * @name Chat
 * @regions ChatRegion
 * @meta_title Chat Tags for Conversational AI Labeling
 * @meta_description Label Studio Chat Tags enable labeling and evaluation of conversational AI interactions, chat transcripts, and dialogue flows for machine learning projects.
 * @param {string} name                                   Name of the element
 * @param {string} value                                  Data field containing an array of chat messages with 'role', 'content', and optional 'timestamp' fields
 * @param {string} [llm]                                  LLM model identifier for AI-assisted conversation continuation (e.g., "gpt-5")
 * @param {string} [messageRoles=user,assistant]          Comma or pipe-separated list of available message roles for new messages
 * @param {string} [minMessages]                          Minimum number of messages required for annotation completion
 * @param {string} [maxMessages]                          Maximum number of messages allowed in the conversation
 */
export const ChatModel = {};
