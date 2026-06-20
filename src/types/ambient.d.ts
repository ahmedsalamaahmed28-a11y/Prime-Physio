declare module "@base-ui/react/merge-props" {
  export function mergeProps<T = any>(...props: any[]): Record<string, any>;
  export function mergePropsN(props: any[]): Record<string, any>;
  export function mergePropsN(props: Record<string, any>[]): Record<string, any>;
  export function mergeClassNames(...classNames: (string | undefined | null)[]): string;
}

declare module "@base-ui/react/use-render" {
  import { JSX, ComponentType, ReactElement } from "react";
  export function useRender<T>(props: T): JSX.Element;
  export namespace useRender {
    type ComponentProps<T extends keyof JSX.IntrinsicElements> = {
      render?: ReactElement | ComponentType<any>;
      [key: string]: any;
    };
  }
}

declare module "@base-ui/react/button" {
  import * as React from "react";
  interface _ButtonProps {
    [key: string]: any;
  }
  declare function Button(props: _ButtonProps & React.RefAttributes<HTMLElement>): React.JSX.Element;
  declare namespace Button {
    type Props = _ButtonProps & React.RefAttributes<HTMLElement>;
  }
  export { Button };
}

declare module "@base-ui/react/tabs" {
  import { JSX, ComponentType, ReactElement } from "react";
  const Tabs: {
    Root: (props: any) => JSX.Element;
    List: (props: any) => JSX.Element;
    Tab: (props: any) => JSX.Element;
    Panel: (props: any) => JSX.Element;
  };
  namespace Tabs {
    namespace Root {
      type Props = { [key: string]: any };
    }
    namespace List {
      type Props = { [key: string]: any };
    }
    namespace Tab {
      type Props = { [key: string]: any };
    }
    namespace Panel {
      type Props = { [key: string]: any };
    }
  }
  export { Tabs };
}

declare module "@base-ui/react/dialog" {
  import { JSX, ComponentType, ReactElement } from "react";
  const Dialog: {
    Root: (props: any) => JSX.Element;
    Trigger: (props: any) => JSX.Element;
    Portal: (props: any) => JSX.Element;
    Close: (props: any) => JSX.Element;
    Backdrop: (props: any) => JSX.Element;
    Popup: (props: any) => JSX.Element;
    Title: (props: any) => JSX.Element;
    Description: (props: any) => JSX.Element;
  };
  namespace Dialog {
    namespace Root {
      type Props = { [key: string]: any };
    }
    namespace Trigger {
      type Props = { [key: string]: any };
    }
    namespace Portal {
      type Props = { [key: string]: any };
    }
    namespace Close {
      type Props = { [key: string]: any };
    }
    namespace Backdrop {
      type Props = { [key: string]: any };
    }
    namespace Popup {
      type Props = { [key: string]: any };
    }
    namespace Title {
      type Props = { [key: string]: any };
    }
    namespace Description {
      type Props = { [key: string]: any };
    }
  }
  export { Dialog };
}

declare module "@base-ui/react/separator" {
  import { JSX } from "react";
  const Separator: {
    (props: Separator.Props): JSX.Element;
  };
  namespace Separator {
    type Props = { [key: string]: any };
  }
  export { Separator };
}

declare module "@base-ui/react/input" {
  import { JSX } from "react";
  const Input: {
    (props: any): JSX.Element;
  };
  export { Input };
}

declare module "@iconify/react" {
  import { JSX } from "react";
  export function Icon(props: { icon: string; className?: string }): JSX.Element;
}
