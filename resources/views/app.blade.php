<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <script>
            (function () {
                var preference = 'system';

                try {
                    var stored = window.localStorage.getItem('insight-theme');

                    if (stored === 'light' || stored === 'dark' || stored === 'system') {
                        preference = stored;
                    }
                } catch (error) {
                    preference = 'system';
                }

                var dark = preference === 'dark';

                if (preference === 'system') {
                    try {
                        dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                    } catch (error) {
                        dark = false;
                    }
                }

                document.documentElement.dataset.theme = dark ? 'dark' : 'light';
                document.documentElement.dataset.themePreference = preference;
            })();
        </script>
        <title>{{ config('app.name', 'Insight') }}</title>
        <link rel="icon" type="image/svg+xml" href="{{ asset('favicon.svg') }}">
        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/app.tsx'])
        @inertiaHead
    </head>
    <body>
        @inertia
    </body>
</html>
