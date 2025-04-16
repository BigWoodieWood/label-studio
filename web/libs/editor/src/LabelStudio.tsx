import { configure } from "mobx";
import { destroy } from "mobx-state-tree";
import { createRoot } from "react-dom/client";
import { Suspense, startTransition, useEffect, type ComponentType } from "react";
import { toCamelCase } from "strman";

import { LabelStudio as LabelStudioReact } from "./Component";
import App from "./components/App/App";
import { configureStore } from "./configureStore";
import legacyEvents from "./core/External";
import { Hotkey } from "./core/Hotkey";
import defaultOptions from "./defaultOptions";
import { destroy as destroySharedStore } from "./mixins/SharedChoiceStore/mixin";
import { EventInvoker } from "./utils/events";
import { isDefined } from "./utils/utilities";

declare global {
  interface Window {
    Htx: any;
  }
}

configure({
  isolateGlobalState: true,
});

type Callback = (...args: any[]) => any;

type LSFUser = any;
type LSFTask = any;
// Import the actual keymap type from Hotkey if available
type Keymap = any; // Using any to bypass the strict type checking for now

// @todo type LSFOptions = SnapshotIn<typeof AppStore>;
// because those options will go as initial values for AppStore
// but it's not types yet, so here is some excerpt of its params
type LSFOptions = Record<string, any> & {
  interfaces: string[];
  keymap: Keymap;
  user: LSFUser;
  users: LSFUser[];
  task: LSFTask;
};

interface ProgressiveLoaderProps {
  store: any;
  onHydrationComplete: () => void;
}

// Use type assertion to bypass the type issues
const AppComponent = App as ComponentType<{store: any}>;

// Loading component to show during progressive hydration
const LoadingFallback: React.FC = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    width: '100%',
    flexDirection: 'column',
    gap: '10px'
  }}>
    <div style={{ width: '50px', height: '50px' }} className="loading-spinner" />
    <div>Loading interface...</div>
  </div>
);

// Progressive loader that tracks hydration progress
const ProgressiveLoader: React.FC<ProgressiveLoaderProps> = ({ store, onHydrationComplete }) => {
  useEffect(() => {
    // Mark hydration as complete after initial render
    const timer = setTimeout(() => {
      // onHydrationComplete();
    }, 0);

    return () => clearTimeout(timer);
  }, [onHydrationComplete]);

  return (
    <Suspense fallback={<LoadingFallback />}>
      <AppComponent store={store} />
    </Suspense>
  );
};

export class LabelStudio {
  static Component = LabelStudioReact;

  static instances = new Set<LabelStudio>();

  static destroyAll() {
    LabelStudio.instances.forEach((inst) => inst.destroy?.());
    LabelStudio.instances.clear();
  }

  options: Partial<LSFOptions>;
  root: Element | string;
  store: any;

  destroy: (() => void) | null = () => {};
  events = new EventInvoker();

  getRootElement(root: Element | string) {
    let element: Element | null = null;

    if (typeof root === "string") {
      element = document.getElementById(root);
    } else {
      element = root;
    }

    if (!element) {
      throw new Error(`Root element not found (selector: ${root})`);
    }

    return element;
  }

  constructor(root: Element | string, userOptions: Partial<LSFOptions> = {}) {
    const options = { ...defaultOptions, ...userOptions };

    if (options.keymap) {
      // Using a type assertion to bypass the type checking
      Hotkey.setKeymap(options.keymap as any);
    }

    this.root = root;
    this.options = options;

    this.supportLegacyEvents();
    this.createApp();

    LabelStudio.instances.add(this);
  }

  on(eventName: string, callback: Callback) {
    this.events.on(eventName, callback);
  }

  off(eventName: string, callback: Callback) {
    if (isDefined(callback)) {
      this.events.off(eventName, callback);
    } else {
      this.events.removeAll(eventName);
    }
  }

  async createApp() {
    console.trace("createApp");
    // Create store with a hydrated flag set to false initially
    const initialOptions = {
      ...this.options,
      hydrated: false
    };

    const { store } = await configureStore(initialOptions, this.events);
    const rootElement = this.getRootElement(this.root);

    this.store = store;
    // window.Htx = this.store;

    let isRendered = false;
    let reactRoot: any = null;

    const renderApp = () => {
      if (isRendered) {
        clearRenderedApp();
      }

      // Use React 18's concurrent mode with createRoot
      if (!reactRoot) {
        reactRoot = createRoot(rootElement);
      }

      // Use startTransition to indicate this is a non-urgent update
      // This allows React to split the work into chunks and yield to browser
      startTransition(() => {
        const onHydrationComplete = () => {
          // Once component tree is mounted, mark the store as hydrated
          // This will trigger appropriate updates in the store
          if (!this.store.hydrated) {
            this.store.setHydrated(true);
          }
        };
        reactRoot.render(
          <ProgressiveLoader
            store={this.store}
            onHydrationComplete={onHydrationComplete}
          />
        );
      });

      isRendered = true;
    };

    const clearRenderedApp = () => {
      if (reactRoot) {
        console.trace("clearRenderedApp");
        reactRoot.unmount();
        reactRoot = null;
      }

      isRendered = false;
    };

    renderApp();

    this.store.setAppControls({
      isRendered() {
        return isRendered;
      },
      render: renderApp,
      clear: clearRenderedApp,
    });

    this.destroy = () => {
      clearRenderedApp();
      console.trace("destroy");
      destroySharedStore();
      destroy(this.store);
      Hotkey.unbindAll();
      this.store = null;
      this.destroy = null;
      LabelStudio.instances.delete(this);
    };
  }

  supportLegacyEvents() {
    const keys = Object.keys(legacyEvents);

    keys.forEach((key) => {
      const callback = this.options[key];

      if (isDefined(callback)) {
        const eventName = toCamelCase(key.replace(/^on/, ""));

        this.events.on(eventName, callback);
      }
    });
  }
}
