import { useEffect, useReducer, useRef } from 'react';
import shallowDiffObjs from './shallowDiffObjs';

export interface HookConfig {
  set: boolean;
  shallow: boolean;
}

export type Selector<State, RT> = (state: State) => RT;

export type Hook<State> = {
  (): undefined;
  (selector: null): undefined;
  (selector: null, config: { set: false }): undefined;
  (selector: null, config: { set: true }): SetState<State>;
  <RT>(selector: Selector<State, RT>): RT;
  <RT>(selector: Selector<State, RT>, config?: { set: false }): RT;
  <RT>(
    selector: Selector<State, RT>,
    config?: { set: false; shallow: true }
  ): RT;
  <RT>(selector: Selector<State, RT>, config?: { set: true }): [
    RT,
    SetState<State>
  ];
  <RT>(selector: Selector<State, RT>, config?: { set: true; shallow: true }): [
    RT,
    SetState<State>
  ];
  <RT>(selector: Selector<State, RT>, config?: { shallow: true }): RT;
};

export type SetStateCallback<State> = (
  state: State
) => Partial<State> | Promise<Partial<State>>;

export type SetState<State> = (
  obj: Partial<State> | SetStateCallback<State>,
  replace?: boolean
) => Promise<void>;

type listenerFn = () => void;

export default function createState<State>(initialState: State): Hook<State> {
  let state: State & Partial<State> = initialState;
  const listerners = new Set<listenerFn>();

  const setState: SetState<State> = async (obj, replace = false) => {
    const objValue = typeof obj === 'function' ? await obj(state) : obj;
    state = replace ? (objValue as State) : Object.assign({}, state, objValue);
    listerners.forEach((l) => {
      if (l) {
        l();
      } else {
        listerners.delete(l);
      }
    });
  };

  const subscribe = (lf: listenerFn) => {
    listerners.add(lf);
  };

  const useStateHook: Hook<State> = (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    selector?: Selector<State, any> | null,
    config?: Partial<HookConfig>
  ) => {
    const [, dispatch] = useReducer((s) => s + 1, 0);
    const selectorValueRef = useRef(
      typeof selector === 'function' ? selector(state) : null
    );

    useEffect(() => {
      if (selectorValueRef.current === null) {
        return;
      }
      const listener = () => {
        const sv = selector?.(state);
        if (config?.shallow) {
          if (
            !shallowDiffObjs(
              selectorValueRef.current as unknown as object,
              sv as object
            )
          ) {
            selectorValueRef.current = sv;
            dispatch();
          }
          return;
        }
        if (sv !== selectorValueRef.current) {
          selectorValueRef.current = sv;
          dispatch();
        }
      };

      subscribe(listener);
    }, [selector, config?.shallow]);

    if (selectorValueRef.current === null) {
      if (!config?.set) return;
      return setState;
    }

    if (config?.set) {
      return [selectorValueRef.current, setState] as const;
    }

    return selectorValueRef.current;
  };

  return useStateHook;
}
