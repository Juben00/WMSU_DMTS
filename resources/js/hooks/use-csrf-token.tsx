import { useEffect } from 'react';
import { usePage } from '@inertiajs/react';
import { SharedData } from '@/types';

export function useCsrfToken() {
    const { props } = usePage<SharedData>();
    const csrfToken = props.csrf_token;

    useEffect(() => {
        if (csrfToken) {
            // Update meta tag
            const metaTag = document.querySelector('meta[name="csrf-token"]');
            if (metaTag) {
                metaTag.setAttribute('content', csrfToken);
            } else {
                // Create meta tag if it doesn't exist
                const newMetaTag = document.createElement('meta');
                newMetaTag.setAttribute('name', 'csrf-token');
                newMetaTag.setAttribute('content', csrfToken);
                document.head.appendChild(newMetaTag);
            }

            // Update window object for axios compatibility
            (window as unknown as { csrfToken: string }).csrfToken = csrfToken;

            // Update axios default header if axios is available
            if ((window as unknown as { axios: any }).axios) {
                (window as unknown as { axios: any }).axios.defaults.headers.common['X-CSRF-TOKEN'] = csrfToken;
            }

        }
    }, [csrfToken]);

    return csrfToken;
}

export default useCsrfToken;
