import { useCallback } from "react";
import { Button, EmptyState } from "../../components";
import { IconCross, IconPencil, IconWebhook } from "@humansignal/icons";
import { Toggle } from "@humansignal/ui";
import { Block, Elem } from "../../utils/bem";
import "./WebhookPage.scss";
import { format } from "date-fns";
import { useAPI } from "../../providers/ApiProvider";
import { WebhookDeleteModal } from "./WebhookDeleteModal";

const WebhookList = ({ onSelectActive, onAddWebhook, webhooks, fetchWebhooks }) => {
  const api = useAPI();

  if (webhooks === null) return <></>;

  const onActiveChange = useCallback(async (event) => {
    const value = event.target.checked;

    await api.callApi("updateWebhook", {
      params: {
        pk: event.target.name,
      },
      body: {
        is_active: value,
      },
    });
    await fetchWebhooks();
  }, []);

  return (
    <Block name="webhook">
      <h1>Webhooks</h1>
      <Elem name="controls">
        <Button onClick={onAddWebhook}>Add Webhook</Button>
      </Elem>
      <Elem>
        {webhooks.length === 0 ? (
          <EmptyState
            icon={<IconWebhook style={{ width: 80, height: 80 }} />}
            title="No webhooks configured"
            description="Webhooks let you notify external systems when annotations are created or updated. Set up your first webhook to start integrating with other systems."
            action={<Button onClick={onAddWebhook}>Add Webhook</Button>}
            footer={
              <div>
                Need help?
                <br />
                <a href="https://labelstud.io/guide/webhooks.html" target="_blank" rel="noreferrer">
                  Learn more about webhooks in our documentation
                </a>
              </div>
            }
          />
        ) : (
          <Block name="webhook-list">
            {webhooks.map((obj) => (
              <Elem key={obj.id} name="item">
                <Elem name="info-wrap">
                  <Elem name="url-wrap">
                    <Elem name="item-active">
                      <Toggle name={obj.id} checked={obj.is_active} onChange={onActiveChange} />
                    </Elem>
                    <Elem name="item-url" onClick={() => onSelectActive(obj.id)}>
                      {obj.url}
                    </Elem>
                  </Elem>
                  <Elem name="item-date">Created {format(new Date(obj.created_at), "dd MMM yyyy, HH:mm")}</Elem>
                </Elem>
                <Elem name="item-control">
                  <Button onClick={() => onSelectActive(obj.id)} icon={<IconPencil />}>
                    Edit
                  </Button>
                  <Button
                    onClick={() =>
                      WebhookDeleteModal({
                        onDelete: async () => {
                          await api.callApi("deleteWebhook", { params: { pk: obj.id } });
                          await fetchWebhooks();
                        },
                      })
                    }
                    look="danger"
                    icon={<IconCross />}
                  >
                    Delete
                  </Button>
                </Elem>
              </Elem>
            ))}
          </Block>
        )}
      </Elem>
    </Block>
  );
};

export default WebhookList;
