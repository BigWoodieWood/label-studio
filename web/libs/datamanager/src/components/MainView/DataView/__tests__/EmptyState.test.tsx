// @ts-nocheck
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import { EmptyState } from "../EmptyState";

jest.mock("@humansignal/ui", () => {
  return {
    Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    Typography: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    IconExternal: () => <span data-testid="icon-external" />,
  };
});

jest.mock("@humansignal/icons", () => {
  return {
    IconUpload: () => <span data-testid="icon-upload" />,
  };
});

describe("DataView EmptyState", () => {
  const noop = () => {};

  it("renders non-interactive dropzone when canImport is false", () => {
    render(<EmptyState canImport={false} onOpenSourceStorageModal={noop} onStartImportWithFiles={noop} />);

    const label = screen.getByTestId("empty-state-label");

    expect(label).not.toHaveAttribute("for");
    expect(label).not.toHaveAttribute("role");
    expect(label).toHaveAttribute("tabindex", "-1");
    expect(label).toHaveAttribute("aria-labelledby", "dm-empty-title");
    expect(label).toHaveAttribute("aria-describedby", "dm-empty-desc");
  });

  it("renders interactive dropzone when canImport is true", () => {
    render(<EmptyState canImport onOpenSourceStorageModal={noop} onStartImportWithFiles={noop} />);

    const label = screen.getByTestId("empty-state-label");

    expect(label).toHaveAttribute("for", "dm-empty-file-input");
    expect(label).not.toHaveAttribute("role");
    expect(label).toHaveAttribute("tabindex", "-1");
    expect(label).toHaveAttribute("aria-labelledby", "dm-empty-title");
    expect(label).toHaveAttribute("aria-describedby", "dm-empty-desc");
  });
});
