# No API routes in this template

M2M clients (e.g. Make.com) authenticate via OAuth 2.0, which does not include Clerk's public metadata in the token.
Without public metadata, permission checks on API routes aren't possible, so no API is exposed.
