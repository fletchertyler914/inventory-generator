export const EDITABLE_FIELDS = [
  "date_rcvd",
  "doc_year",
  "doc_date_range",
  "bates_stamp",
  "notes",
] as const

export type EditableField = typeof EDITABLE_FIELDS[number]

