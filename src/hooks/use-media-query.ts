import { useState, useEffect } from "react"

export function useMediaQuery(query: string) {
    const [value, setValue] = useState(() => {
        if (typeof window === 'undefined') return false
        return window.matchMedia(query).matches
    })

    useEffect(() => {
        function onChange(event: MediaQueryListEvent) {
            setValue(event.matches)
        }

        const result = matchMedia(query)
        result.addEventListener("change", onChange)
        // Set initial value in case it changed since mount (optional, usually reliable from init)
        // eslint-disable-next-line
        if (result.matches !== value) setValue(result.matches)

        return () => result.removeEventListener("change", onChange)
    }, [query, value])

    return value
}
