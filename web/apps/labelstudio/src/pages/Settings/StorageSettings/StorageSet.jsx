import { useCallback, useContext, useEffect, useState } from "react";
import { Button, Columns, EmptyState, Spinner } from "../../../components";
import { confirm, modal } from "../../../components/Modal/Modal";
import { IconDatasets } from "@humansignal/icons";
import { ApiContext } from "../../../providers/ApiProvider";
import { useProject } from "../../../providers/ProjectProvider";
import { StorageCard } from "./StorageCard";
import { StorageForm } from "./StorageForm";

export const StorageSet = ({ title, target, rootClass, buttonLabel }) => {
  const api = useContext(ApiContext);
  const { project } = useProject();
  const [storages, setStorages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [storageTypes, setStorageTypes] = useState([]);

  useEffect(() => {
    api
      .callApi("storageTypes", {
        params: {
          target,
        },
      })
      .then((types) => {
        setStorageTypes(types ?? []);
      });
  }, []);

  const fetchStorages = useCallback(async () => {
    if (!project.id) {
      console.warn("Project ID not provided");
      return;
    }

    setLoading(true);
    const result = await api.callApi("listStorages", {
      params: {
        project: project.id,
        target,
      },
    });

    const storageTypes = await api.callApi("storageTypes", {
      params: {
        target,
      },
    });

    setStorageTypes(storageTypes);

    if (result !== null) {
      setStorages(result);
      setLoaded(true);
    }

    setLoading(false);
  }, [project]);

  const showStorageFormModal = useCallback(
    (storage) => {
      const action = storage ? "Edit" : "Add";
      const actionTarget = target === "export" ? "Target" : "Source";
      const title = `${action} ${actionTarget} Storage`;

      const modalRef = modal({
        title,
        closeOnClickOutside: false,
        style: { width: 760 },
        body: (
          <StorageForm
            target={target}
            storage={storage}
            project={project.id}
            rootClass={rootClass}
            storageTypes={storageTypes}
            onSubmit={async () => {
              await fetchStorages();
              modalRef.close();
            }}
          />
        ),
        footer: (
          <>
            Save completed annotations to Amazon S3, Google Cloud, Microsoft Azure, or Redis.
            <br />
            <a href="https://labelstud.io/guide/storage.html">See more in the documentation</a>.
          </>
        ),
      });
    },
    [project, fetchStorages, target, rootClass],
  );

  const onEditStorage = useCallback(
    async (storage) => {
      showStorageFormModal(storage);
    },
    [showStorageFormModal],
  );

  const onDeleteStorage = useCallback(
    async (storage) => {
      confirm({
        title: "Deleting storage",
        body: "This action cannot be undone. Are you sure?",
        buttonLook: "destructive",
        onOk: async () => {
          const response = await api.callApi("deleteStorage", {
            params: {
              type: storage.type,
              pk: storage.id,
              target,
            },
          });

          if (response !== null) fetchStorages();
        },
      });
    },
    [fetchStorages],
  );

  useEffect(() => {
    fetchStorages();
  }, [fetchStorages]);

  return (
    <Columns.Column title={title}>
      <div className={rootClass.elem("controls")}>
        <Button onClick={() => showStorageFormModal()}>{buttonLabel}</Button>
      </div>

      {loading && !loaded ? (
        <div className={rootClass.elem("empty")}>
          <Spinner size={32} />
        </div>
      ) : storages.length === 0 ? (
        <EmptyState
          icon={<IconDatasets style={{ width: 80, height: 80 }} />}
          title={target === "export" ? "No export storages configured" : "No import storages configured"}
          description={target === "export" ? 
            "Configure where to export completed annotations, such as Amazon S3, Google Cloud Storage, or Microsoft Azure." : 
            "Configure where to import data from, such as Amazon S3, Google Cloud Storage, or Microsoft Azure."}
          action={<Button onClick={() => showStorageFormModal()}>{buttonLabel}</Button>}
          footer={
            <div>
              Need help?
              <br />
              <a href="https://labelstud.io/guide/storage.html" target="_blank" rel="noreferrer">
                Learn more about storage integrations in our documentation
              </a>
            </div>
          }
        />
      ) : (
        storages.map((storage) => (
          <StorageCard
            key={storage.id}
            storage={storage}
            target={target}
            rootClass={rootClass}
            storageTypes={storageTypes}
            onEditStorage={onEditStorage}
            onDeleteStorage={onDeleteStorage}
          />
        ))
      )}
    </Columns.Column>
  );
};
