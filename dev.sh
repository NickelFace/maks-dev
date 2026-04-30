#!/bin/bash
[ -f .env ] && export $(grep -v '^#' .env | xargs)
hugo && npx pagefind --site public && hugo server --disableFastRender
