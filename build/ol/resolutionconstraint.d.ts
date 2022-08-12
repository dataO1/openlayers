/**
 * @param {Array<number>} resolutions Resolutions.
 * @param {boolean} [opt_smooth] If true, the view will be able to slightly exceed resolution limits. Default: true.
 * @param {import("./extent.js").Extent} [opt_maxExtent] Maximum allowed extent.
 * @param {boolean} [opt_showFullExtent] If true, allows us to show the full extent. Default: false.
 * @return {Type} Zoom function.
 */
export function createSnapToResolutions(resolutions: Array<number>, opt_smooth?: boolean | undefined, opt_maxExtent?: import("./extent.js").Extent | undefined, opt_showFullExtent?: boolean | undefined): Type;
/**
 * @param {number} power Power.
 * @param {number} maxResolution Maximum resolution.
 * @param {number} [opt_minResolution] Minimum resolution.
 * @param {boolean} [opt_smooth] If true, the view will be able to slightly exceed resolution limits. Default: true.
 * @param {import("./extent.js").Extent} [opt_maxExtent] Maximum allowed extent.
 * @param {boolean} [opt_showFullExtent] If true, allows us to show the full extent. Default: false.
 * @return {Type} Zoom function.
 */
export function createSnapToPower(power: number, maxResolution: number, opt_minResolution?: number | undefined, opt_smooth?: boolean | undefined, opt_maxExtent?: import("./extent.js").Extent | undefined, opt_showFullExtent?: boolean | undefined): Type;
/**
 * @param {number} maxResolution Max resolution.
 * @param {number} minResolution Min resolution.
 * @param {boolean} [opt_smooth] If true, the view will be able to slightly exceed resolution limits. Default: true.
 * @param {import("./extent.js").Extent} [opt_maxExtent] Maximum allowed extent.
 * @param {boolean} [opt_showFullExtent] If true, allows us to show the full extent. Default: false.
 * @return {Type} Zoom function.
 */
export function createMinMaxResolution(maxResolution: number, minResolution: number, opt_smooth?: boolean | undefined, opt_maxExtent?: import("./extent.js").Extent | undefined, opt_showFullExtent?: boolean | undefined): Type;
export type Type = (arg0: (number | undefined), arg1: number, arg2: import("./size.js").Size, arg3: boolean | undefined) => (number | undefined);
//# sourceMappingURL=resolutionconstraint.d.ts.map