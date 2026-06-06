# Image Resizer Worker

This Worker resizes and optimizes images at the edge before they are served to the app.

## How it works

- The Worker handles a dedicated image route, for example `https://img.kirtanoasis.com/lead-singers/bb-rasikananda-maharaja.jpg?w=320`.
- It fetches the original full-size file from `ORIGINAL_IMAGES_BASE_URL`.
- It applies Cloudflare image transformations with `cf.image`.
- It returns a cached optimized response to the client.

## Important

Use a different origin for originals than the Worker route itself.

Good:
- Worker route: `https://img.kirtanoasis.com/...`
- Original images: `https://images-origin.kirtanoasis.com/...`

Avoid:
- Worker route fetching from its own hostname/path, which would create a loop.

## Recommended DB value

Store object keys without a leading slash:

`lead-singers/bb-rasikananda-maharaja.jpg`

## Example request

`/lead-singers/bb-rasikananda-maharaja.jpg?w=320&h=320&fit=cover&format=auto`

## Query parameters

- `w` or `width`
- `h` or `height`
- `q` or `quality`
- `fit`
- `format`
