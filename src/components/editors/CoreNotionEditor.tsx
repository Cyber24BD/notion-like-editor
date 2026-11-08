import { forwardRef } from 'react'
import {
  PageEditor,
  type NotionEditorHandle,
  type NotionEditorProps,
} from '../PageEditor'
import { CORE_FEATURES, featureKey } from '../../editor/features'

export const NotionEditor = forwardRef<
  NotionEditorHandle,
  NotionEditorProps
>(function NotionEditor(props, ref) {
  return (
    <PageEditor
      key={`${props.documentId}:${featureKey(CORE_FEATURES)}`}
      ref={ref}
      {...props}
      features={CORE_FEATURES}
    />
  )
})
