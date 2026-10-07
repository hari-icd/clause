#!/usr/bin/env bash
# ds/tokens/_resolver.sh
#
# Single entry point for resolving any token reference to its terminal value.
# ds/tokens/variables.json is a raw Figma Variables API export (collections +
# variables, aliases as {type:VARIABLE_ALIAS,id}) and ds/tokens/text-styles.json
# is a raw text-styles export. Both mirror Figma 1:1 and must not be hand-edited
# — this script only READS them.
#
# Usage:
#   _resolver.sh "Colors/Text/text-primary (900)"             # semantic color, Light mode -> hex
#   _resolver.sh "Colors/Text/text-primary (900)" --mode dark  # Dark mode
#   _resolver.sh "Palette/Brand/600"                            # primitive palette -> hex
#   _resolver.sh "spacing-md"                                   # -> px number
#   _resolver.sh "radius-md"                                    # -> px number
#   _resolver.sh --style "Text md/Semibold"                     # -> {fontFamily,fontSize,lineHeight,...}
#   _resolver.sh --test
#   _resolver.sh --help

set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
VARS="$DIR/variables.json"
STYLES="$DIR/text-styles.json"

# jq: given a variable name, return its resolved terminal value for a mode (by mode name).
# Chases VARIABLE_ALIAS across collections. COLOR -> "#rrggbb", FLOAT/STRING -> raw.
resolve_var() {
    local name="$1"
    local mode="${2:-Light mode}"
    jq -r --arg name "$name" --arg mode "$mode" '
        def hex2: if length == 1 then "0" + . else . end;
        def torgb: (. * 255 | round) as $n
            | ($n | tostring | if test("^[0-9]+$") then . else "0" end) as $s
            | ($n | if . < 0 then 0 elif . > 255 then 255 else . end) as $c
            | ($c | . as $v | (["0","1","2","3","4","5","6","7","8","9","a","b","c","d","e","f"]) as $h
               | (($v/16|floor) as $hi | ($v - $hi*16) as $lo | $h[$hi] + $h[$lo]));
        def colorhex: "#" + (.r|torgb) + (.g|torgb) + (.b|torgb);

        (.variables | map({(.id): .}) | add) as $byId
        | (.collections | map({(.id): .}) | add) as $byColl
        | (.variables | map(select(.name == $name)) | first) as $v
        | if $v == null then "(not found: " + $name + ")" else
            def resolveVal(v; visited):
                ($byColl[v.variableCollectionId]) as $coll
                | ($coll.modes | map(select(.name == $mode)) | first // $coll.modes[0]) as $m
                | (v.valuesByMode[$m.modeId] // v.valuesByMode[$coll.defaultModeId]) as $val
                | if $val == null then "(no value for mode)"
                  elif ($val|type) == "object" and $val.type == "VARIABLE_ALIAS" then
                    if (visited | index($val.id)) then "(cycle)" else
                        resolveVal($byId[$val.id]; visited + [$val.id])
                    end
                  elif ($val|type) == "object" then ($val | colorhex)
                  else $val
                  end;
            resolveVal($v; [$v.id])
          end
    ' "$VARS"
}

resolve_style() {
    local name="$1"
    jq -c --arg name "$name" \
        '(.textStyles | map(select(.name == $name)) | first) // ("(not found: " + $name + ")")' \
        "$STYLES"
}

usage() {
    sed -n '/^# ds\/tokens\/_resolver.sh/,/^set -euo/p' "$0" | sed -e '$d' -e 's/^# \{0,1\}//'
}

main() {
    case "${1:-}" in
        --style)
            shift
            resolve_style "$1"
            ;;
        --test)
            printf '== Palette / spacing / radius ==\n'
            printf '  Palette/Brand/600            -> %s\n' "$(resolve_var 'Palette/Brand/600')"
            printf '  spacing-md                   -> %s\n' "$(resolve_var 'spacing-md')"
            printf '  radius-md                    -> %s\n' "$(resolve_var 'radius-md')"
            printf '\n== Semantic colors (Light + Dark) ==\n'
            printf '  text-primary (900) light     -> %s\n' "$(resolve_var 'Colors/Text/text-primary (900)' 'Light mode')"
            printf '  text-primary (900) dark      -> %s\n' "$(resolve_var 'Colors/Text/text-primary (900)' 'Dark mode')"
            printf '\n== Text style ==\n'
            printf '  Text md/Semibold             -> %s\n' "$(resolve_style 'Text md/Semibold')"
            ;;
        -h|--help|'')
            usage
            ;;
        *)
            local name="$1"
            local mode="Light mode"
            if [[ "${2:-}" == "--mode" ]]; then
                case "${3:-light}" in
                    dark) mode="Dark mode" ;;
                    *) mode="Light mode" ;;
                esac
            fi
            resolve_var "$name" "$mode"
            ;;
    esac
}

main "$@"
