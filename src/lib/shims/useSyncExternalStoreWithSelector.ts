import {
  useDebugValue,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from 'react'

const is = (x: unknown, y: unknown) =>
  (x === y && (x !== 0 || 1 / (x as number) === 1 / (y as number))) ||
  (x !== x && y !== y)

const objectIs = typeof Object.is === 'function' ? Object.is : is

interface Instance<Selection> {
  hasValue: boolean
  value: Selection | null
}

/**
 * ESM implementation of React's useSyncExternalStoreWithSelector shim.
 * Replaces the CommonJS package so the bundled library never calls require().
 */
export function useSyncExternalStoreWithSelector<Snapshot, Selection>(
  subscribe: (onStoreChange: () => void) => () => void,
  getSnapshot: () => Snapshot,
  getServerSnapshot: null | undefined | (() => Snapshot),
  selector: (snapshot: Snapshot) => Selection,
  isEqual?: (a: Selection, b: Selection) => boolean,
): Selection {
  const instRef = useRef<Instance<Selection> | null>(null)
  let inst: Instance<Selection>
  if (instRef.current === null) {
    inst = { hasValue: false, value: null }
    instRef.current = inst
  } else {
    inst = instRef.current
  }

  const [getSelection, getServerSelection] = useMemo(() => {
    let hasMemo = false
    let memoizedSnapshot: Snapshot
    let memoizedSelection: Selection

    const memoizedSelector = (nextSnapshot: Snapshot): Selection => {
      if (!hasMemo) {
        hasMemo = true
        memoizedSnapshot = nextSnapshot
        const nextSelection = selector(nextSnapshot)
        if (isEqual !== undefined && inst.hasValue) {
          const currentSelection = inst.value as Selection
          if (isEqual(currentSelection, nextSelection)) {
            memoizedSelection = currentSelection
            return currentSelection
          }
        }
        memoizedSelection = nextSelection
        return nextSelection
      }

      const currentSelection = memoizedSelection
      if (objectIs(memoizedSnapshot, nextSnapshot)) return currentSelection

      const nextSelection = selector(nextSnapshot)
      if (isEqual !== undefined && isEqual(currentSelection, nextSelection)) {
        memoizedSnapshot = nextSnapshot
        return currentSelection
      }
      memoizedSnapshot = nextSnapshot
      memoizedSelection = nextSelection
      return nextSelection
    }

    const maybeGetServerSnapshot =
      getServerSnapshot === undefined ? null : getServerSnapshot

    return [
      () => memoizedSelector(getSnapshot()),
      maybeGetServerSnapshot === null
        ? undefined
        : () => memoizedSelector(maybeGetServerSnapshot()),
    ] as const
  }, [getSnapshot, getServerSnapshot, selector, isEqual])

  const value = useSyncExternalStore(subscribe, getSelection, getServerSelection)
  useEffect(() => {
    inst.hasValue = true
    inst.value = value
  }, [inst, value])
  useDebugValue(value)
  return value
}
