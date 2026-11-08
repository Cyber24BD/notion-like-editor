import { forwardRef } from 'react'
import {
  PageEditor,
  type NotionEditorHandle,
  type NotionEditorProps,
} from '../PageEditor'
import { STANDARD_FEATURES, featureKey } from '../../editor/features'

export const NotionEditor = forwardRef<
  NotionEditorHandle,
  NotionEditorProps
>(function NotionEditor(props, ref) {
  return (
    <PageEditor
      key={`${props.documentId}:${featureKey(STANDARD_FEATURES)}`}
      ref={ref}
      {...props}
      features={STANDARD_FEATURES}
    />
  )
})
