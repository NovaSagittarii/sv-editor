/*!
 * @pixi/filter-outline - v4.2.0
 * Compiled Fri, 05 Aug 2022 19:53:35 UTC
 *
 * @pixi/filter-outline is licensed under the MIT License.
 * http://www.opensource.org/licenses/mit-license
 */
const {Filter} = PIXI; // import { Filter } from '@pixi/core';
const {rgb2hex, hex2rgb} = PIXI.utils; // import { rgb2hex, hex2rgb } from '@pixi/utils';

/*! *****************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global Reflect, Promise */

var extendStatics = function(d, b) {
    extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) { if (Object.prototype.hasOwnProperty.call(b, p)) { d[p] = b[p]; } } };
    return extendStatics(d, b);
};

function __extends(d, b) {
    extendStatics(d, b);
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
}

var vertex = "attribute vec2 aVertexPosition;\nattribute vec2 aTextureCoord;\n\nuniform mat3 projectionMatrix;\n\nvarying vec2 vTextureCoord;\n\nvoid main(void)\n{\n    gl_Position = vec4((projectionMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);\n    vTextureCoord = aTextureCoord;\n}";

var fragment = "varying vec2 vTextureCoord;\nuniform sampler2D uSampler;\n\nuniform vec2 thickness;\nuniform vec4 outlineColor;\nuniform vec4 filterClamp;\n\nconst float DOUBLE_PI = 3.14159265358979323846264 * 2.;\n\nvoid main(void) {\n    vec4 ownColor = texture2D(uSampler, vTextureCoord);\n    vec4 curColor;\n    float maxAlpha = 0.;\n    vec2 displaced;\n    for (float angle = 0.; angle <= DOUBLE_PI; angle += ${angleStep}) {\n        displaced.x = vTextureCoord.x + thickness.x * cos(angle);\n        displaced.y = vTextureCoord.y + thickness.y * sin(angle);\n        curColor = texture2D(uSampler, clamp(displaced, filterClamp.xy, filterClamp.zw));\n        maxAlpha = max(maxAlpha, curColor.a);\n    }\n    float resultAlpha = max(maxAlpha, ownColor.a);\n    gl_FragColor = vec4((ownColor.rgb + outlineColor.rgb * (1. - ownColor.a)) * resultAlpha, resultAlpha);\n}\n";

/**
 * OutlineFilter, originally by mishaa
 * http://www.html5gamedevs.com/topic/10640-outline-a-sprite-change-certain-colors/?p=69966
 * http://codepen.io/mishaa/pen/emGNRB<br>
 * ![original](../tools/screenshots/dist/original.png)![filter](../tools/screenshots/dist/outline.png)
 *
 * @class
 * @extends PIXI.Filter
 * @memberof PIXI.filters
 * @see {@link https://www.npmjs.com/package/@pixi/filter-outline|@pixi/filter-outline}
 * @see {@link https://www.npmjs.com/package/pixi-filters|pixi-filters} *
 * @example
 *  someSprite.filters = [new OutlineFilter(2, 0x99ff99)];
 */
var OutlineFilter = /** @class */ (function (_super) {
    __extends(OutlineFilter, _super);
    /**
     * @param {number} [thickness=1] - The tickness of the outline. Make it 2 times more for resolution 2
     * @param {number} [color=0x000000] - The color of the outline.
     * @param {number} [quality=0.1] - The quality of the outline from `0` to `1`, using a higher quality
     *        setting will result in slower performance and more accuracy.
     */
    function OutlineFilter(thickness, color, quality) {
        if (thickness === void 0) { thickness = 1; }
        if (color === void 0) { color = 0x000000; }
        if (quality === void 0) { quality = 0.1; }
        var _this = _super.call(this, vertex, fragment.replace(/\$\{angleStep\}/, OutlineFilter.getAngleStep(quality))) || this;
        _this._thickness = 1;
        _this.uniforms.thickness = new Float32Array([0, 0]);
        _this.uniforms.outlineColor = new Float32Array([0, 0, 0, 1]);
        Object.assign(_this, { thickness: thickness, color: color, quality: quality });
        return _this;
    }
    /**
     * Get the angleStep by quality
     * @private
     */
    OutlineFilter.getAngleStep = function (quality) {
        var samples = Math.max(quality * OutlineFilter.MAX_SAMPLES, OutlineFilter.MIN_SAMPLES);
        return (Math.PI * 2 / samples).toFixed(7);
    };
    OutlineFilter.prototype.apply = function (filterManager, input, output, clear) {
        this.uniforms.thickness[0] = this._thickness / input._frame.width;
        this.uniforms.thickness[1] = this._thickness / input._frame.height;
        filterManager.applyFilter(this, input, output, clear);
    };
    Object.defineProperty(OutlineFilter.prototype, "color", {
        /**
         * The color of the glow.
         * @default 0x000000
         */
        get: function () {
            return rgb2hex(this.uniforms.outlineColor);
        },
        set: function (value) {
            hex2rgb(value, this.uniforms.outlineColor);
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(OutlineFilter.prototype, "thickness", {
        /**
         * The thickness of the outline.
         * @default 1
         */
        get: function () {
            return this._thickness;
        },
        set: function (value) {
            this._thickness = value;
            this.padding = value;
        },
        enumerable: false,
        configurable: true
    });
    /** The minimum number of samples for rendering outline. */
    OutlineFilter.MIN_SAMPLES = 1;
    /** The maximum number of samples for rendering outline. */
    OutlineFilter.MAX_SAMPLES = 100;
    return OutlineFilter;
}(Filter));

export { OutlineFilter };
//# sourceMappingURL=filter-outline.esm.mjs.map
