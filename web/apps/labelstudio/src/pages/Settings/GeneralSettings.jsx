import { Button, EnterpriseBadge, Select, Typography } from "@humansignal/ui";
import { useCallback, useContext, useRef } from "react";
import { InlineError } from "../../components/Error/InlineError";
import { Form, Input, TextArea } from "../../components/Form";
import { RadioGroup } from "../../components/Form/Elements/RadioGroup/RadioGroup";
import { HeidiTips } from "../../components/HeidiTips/HeidiTips";
import { createURL } from "../../components/HeidiTips/utils";
import { ProjectContext } from "../../providers/ProjectProvider";
import { Block, Elem } from "../../utils/bem";
import { FF_LSDV_E_297, isFF } from "../../utils/feature-flags";

export const GeneralSettings = () => {
  const { project, fetchProject } = useContext(ProjectContext);
  const formRef = useRef();

  const updateProject = useCallback(() => {
    if (project.id) fetchProject(project.id, true);
  }, [project, fetchProject]);

  const colors = ["#FDFDFC", "#FF4C25", "#FF750F", "#ECB800", "#9AC422", "#34988D", "#617ADA", "#CC6FBE"];

  const samplings = [
    {
      value: "Sequential",
      label: "Sequential",
      description: "Tasks are ordered by Task ID",
    },
    {
      value: "Uniform",
      label: "Random",
      description: "Tasks are chosen with uniform random",
    },
  ];

  return (
    <Block name="general-settings">
      <Elem name={"wrapper"}>
        <h1>General Settings</h1>
        <Block name="settings-wrapper">
          <Form
            ref={formRef}
            action="updateProject"
            formData={{ ...project }}
            params={{ pk: project.id }}
            onSubmit={updateProject}
          >
            <Form.Row columnCount={1} rowGap="16px">
              <Input
                name="title"
                label="Project Name"
                required
                validate={[Form.Validator.minLength(3), Form.Validator.maxLength(50)]}
                onBlur={() => {
                  // Trigger form validation to show errors immediately
                  formRef.current?.validateFields();
                }}
              />

              <TextArea name="description" label="Description" style={{ minHeight: 128 }} />
              {isFF(FF_LSDV_E_297) && (
                <Block name="workspace-placeholder">
                  <Elem name="badge-wrapper">
                    <Elem name="title">Workspace</Elem>
                    <EnterpriseBadge className="ml-2" />
                  </Elem>
                  <Select placeholder="Select an option" disabled options={[]} />
                  <Typography size="small" className="my-tight">
                    Simplify project management by organizing projects into workspaces.{" "}
                    <a
                      target="_blank"
                      href={createURL(
                        "https://docs.humansignal.com/guide/manage_projects#Create-workspaces-to-organize-projects",
                        {
                          experiment: "project_settings_tip",
                          treatment: "simplify_project_management",
                        },
                      )}
                      rel="noreferrer"
                      className="underline hover:no-underline"
                    >
                      Learn more
                    </a>
                  </Typography>
                </Block>
              )}
              <RadioGroup name="color" label="Color" size="large" labelProps={{ size: "large" }}>
                {colors.map((color) => (
                  <RadioGroup.Button key={color} value={color}>
                    <Block name="color" style={{ "--background": color }} />
                  </RadioGroup.Button>
                ))}
              </RadioGroup>

              <RadioGroup label="Task Sampling" labelProps={{ size: "large" }} name="sampling" simple>
                {samplings.map(({ value, label, description }) => (
                  <RadioGroup.Button
                    key={value}
                    value={`${value} sampling`}
                    label={`${label} sampling`}
                    description={description}
                  />
                ))}
                {isFF(FF_LSDV_E_297) && (
                  <RadioGroup.Button
                    key="uncertainty-sampling"
                    value=""
                    label={
                      <>
                        Uncertainty sampling <EnterpriseBadge className="ml-2" />
                      </>
                    }
                    disabled
                    description={
                      <>
                        Tasks are chosen according to model uncertainty score (active learning mode).{" "}
                        <a
                          target="_blank"
                          href={createURL("https://docs.humansignal.com/guide/active_learning", {
                            experiment: "project_settings_workspace",
                            treatment: "workspaces",
                          })}
                          rel="noreferrer"
                        >
                          Learn more
                        </a>
                      </>
                    }
                  />
                )}
              </RadioGroup>
            </Form.Row>

            <Form.Actions>
              <Form.Indicator>
                <span case="success">Saved!</span>
              </Form.Indicator>
              <Button type="submit" className="w-[150px]" aria-label="Save general settings">
                Save
              </Button>
            </Form.Actions>

            <InlineError />
          </Form>
        </Block>
      </Elem>
      {isFF(FF_LSDV_E_297) && <HeidiTips collection="projectSettings" />}
    </Block>
  );
};

GeneralSettings.menuItem = "General";
GeneralSettings.path = "/";
GeneralSettings.exact = true;
