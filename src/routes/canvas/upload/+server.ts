import { json } from '@sveltejs/kit'
import type { RequestHandler } from '@sveltejs/kit'

export const POST: RequestHandler = async({ request }) => {
    // Must be credentialed
    console.log(request.body)
    return json({ })
}