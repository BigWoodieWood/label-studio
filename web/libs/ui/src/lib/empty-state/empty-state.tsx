import React, { type ReactNode, forwardRef } from "react";
import { cn } from "../../utils/utils";
import { Typography } from "../typography/typography";
import styles from "./empty-state.module.scss";

// Size configuration
const sizes = {
  large: styles["size-large"],
  medium: styles["size-medium"], 
  small: styles["size-small"],
} as const;

// Color variant configuration
const variants = {
  primary: styles["variant-primary"],
  neutral: styles["variant-neutral"],
  negative: styles["variant-negative"],
  positive: styles["variant-positive"],
  warning: styles["variant-warning"],
  gradient: styles["variant-gradient"],
} as const;

const iconSizes = {
  large: { width: 40, height: 40 }, // Data Manager size
  medium: { width: 32, height: 32 }, // Home page - icon fits well in w-12 h-12 container
  small: { width: 24, height: 24 }, // Sidepanel size
} as const;

const titleVariants = {
  large: { variant: "headline" as const, size: "medium" as const }, // Data Manager
  medium: { variant: "headline" as const, size: "small" as const }, // Home page
  small: { variant: "label" as const, size: "medium" as const }, // Sidepanel uses body-medium with font-medium
} as const;

const descriptionVariants = {
  large: { variant: "body" as const, size: "medium" as const }, // Data Manager
  medium: { variant: "body" as const, size: "small" as const }, // Home page  
  small: { variant: "body" as const, size: "small" as const }, // Sidepanel uses body-small
} as const;

export type EmptyStateSize = keyof typeof sizes;
export type EmptyStateVariant = keyof typeof variants;

export interface EmptyStateProps {
  /**
   * Size of the empty state
   * - large: 40px icon, headline medium text, wider spacing (Data Manager style)
   * - medium: 32px icon, headline small text, standard spacing (Home page style)
   * - small: 24px icon, body medium text, tighter spacing (Sidepanel style)
   */
  size?: EmptyStateSize;
  
  /**
   * Color variant of the empty state
   * - primary: Blue theme with primary colors
   * - neutral: Gray theme for neutral states
   * - negative: Red theme for error states
   * - positive: Green theme for success states
   * - warning: Orange/Yellow theme for warning states
   * - gradient: AI gradient theme with special effects
   */
  variant?: EmptyStateVariant;
  
  /**
   * Icon element to display
   */
  icon: ReactNode;
  
  /**
   * Main title text
   */
  title: string;
  
  /**
   * Description text below the title
   */
  description: string;
  
  /**
   * Action buttons or other interactive elements
   */
  actions?: ReactNode;
  
  /**
   * Additional content to display between description and actions
   */
  additionalContent?: ReactNode;
  
  /**
   * Footer content displayed at the bottom
   */
  footer?: ReactNode;
  
  /**
   * Custom wrapper class name
   */
  className?: string;
  
  /**
   * Test ID for testing
   */
  "data-testid"?: string;
  
  /**
   * ARIA label for the empty state
   */
  "aria-label"?: string;
  
  /**
   * ID for the title element (for aria-labelledby)
   */
  titleId?: string;
  
  /**
   * ID for the description element (for aria-describedby)
   */
  descriptionId?: string;
}

/**
 * Empty State Component
 * 
 * A reusable component for displaying empty states throughout the application.
 * Supports different sizes and customizable content including icons, text, actions, and footer.
 * 
 * Features:
 * - Three sizes: large, medium, small
 * - Six color variants: primary, neutral, negative, positive, warning, gradient
 * - Flexible content areas for actions and additional elements
 * - Full accessibility support with ARIA attributes
 * - Consistent spacing and typography
 * 
 * @example
 * ```tsx
 * <EmptyState
 *   size="large"
 *   variant="primary"
 *   icon={<IconUpload />}
 *   title="Import your data"
 *   description="Choose a dataset from your computer to get started"
 *   actions={
 *     <Button onClick={onImport}>Import Data</Button>
 *   }
 * />
 * ```
 */
export const EmptyState = forwardRef<HTMLDivElement, EmptyStateProps>(
  (
    {
      size = "medium",
      variant = "primary",
      icon,
      title,
      description,
      actions,
      additionalContent,
      footer,
      className,
      "data-testid": testId,
      "aria-label": ariaLabel,
      titleId,
      descriptionId,
      ...rest
    },
    ref
  ) => {
    // Clone the icon and ensure it has the correct size for the size
    const iconSize = iconSizes[size];
    const iconWithSize = React.cloneElement(icon as React.ReactElement, {
      width: iconSize.width,
      height: iconSize.height,
    });

    // Get typography configuration for the size
    const titleConfig = titleVariants[size];
    const descriptionConfig = descriptionVariants[size];

    // Generate unique IDs if not provided
    const generatedTitleId = titleId || `empty-state-title-${Math.random().toString(36).substr(2, 9)}`;
    const generatedDescriptionId = descriptionId || `empty-state-desc-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div
        ref={ref}
        className={cn(
          "empty-state",
          styles.base,
          sizes[size],
          variants[variant],
          className
        )}
        data-testid={testId}
        aria-label={ariaLabel}
        aria-labelledby={!ariaLabel ? generatedTitleId : undefined}
        aria-describedby={generatedDescriptionId}
        {...rest}
      >
        {/* Icon */}
        <div className={cn(
          "empty-state__icon",
          styles.icon,
          "flex items-center justify-center rounded-full"
        )}>
          {iconWithSize}
        </div>

        {/* Title and Description - Special layout for small variant */}
        {size === "small" ? (
          <div className={cn("empty-state__text-wrapper", styles["text-wrapper"])}>
            <Typography
              {...titleConfig}
              className={cn("empty-state__title", styles.title, "text-neutral-content")}
              id={generatedTitleId}
            >
              {title}
            </Typography>

            <Typography
              {...descriptionConfig}
              className={cn(
                "empty-state__description",
                styles.description,
                "text-neutral-content-subtler"
              )}
              id={generatedDescriptionId}
            >
              {description}
            </Typography>
          </div>
        ) : (
          <>
            {/* Standard layout for large and medium */}
            <Typography
              {...titleConfig}
              className={cn("empty-state__title", styles.title)}
              id={generatedTitleId}
            >
              {title}
            </Typography>

            <Typography
              {...descriptionConfig}
              className={cn(
                "empty-state__description",
                styles.description,
                "text-neutral-content-subtler"
              )}
              id={generatedDescriptionId}
            >
              {description}
            </Typography>
          </>
        )}

        {/* Additional Content */}
        {additionalContent && (
          <div className={cn("empty-state__additional", styles.additional)}>
            {additionalContent}
          </div>
        )}

        {/* Actions */}
        {actions && (
          <div className={cn("empty-state__actions", styles.actions)}>
            {(() => {
              // Flatten children and filter out null/false values to count actual rendered elements
              const flattenedActions = React.Children.toArray(actions).flat().filter(Boolean);
              const actualActionCount = flattenedActions.length;
              const isSingleAction = actualActionCount === 1;

              return (
                <div className={cn(
                  "flex gap-base w-full",
                  isSingleAction ? "justify-center" : "",
                  styles[`actions-${size}`]
                )}>
                  {actions}
                </div>
              );
            })()}
          </div>
        )}

        {/* Footer */}
        {footer && (
          <div className={cn("empty-state__footer", styles.footer)}>
            {footer}
          </div>
        )}
      </div>
    );
  }
);

EmptyState.displayName = "EmptyState";
