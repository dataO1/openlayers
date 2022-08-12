/**
 * @module ol/format/MVT
 */
//FIXME Implement projection handling
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
import FeatureFormat, { transformGeometryWithOptions } from './Feature.js';
import GeometryLayout from '../geom/GeometryLayout.js';
import LineString from '../geom/LineString.js';
import MultiLineString from '../geom/MultiLineString.js';
import MultiPoint from '../geom/MultiPoint.js';
import MultiPolygon from '../geom/MultiPolygon.js';
import PBF from 'pbf';
import Point from '../geom/Point.js';
import Polygon from '../geom/Polygon.js';
import Projection from '../proj/Projection.js';
import RenderFeature from '../render/Feature.js';
import Units from '../proj/Units.js';
import { assert } from '../asserts.js';
import { get } from '../proj.js';
import { inflateEnds } from '../geom/flat/orient.js';
/**
 * @typedef {Object} Options
 * @property {import("../Feature.js").FeatureClass} [featureClass] Class for features returned by
 * {@link module:ol/format/MVT~MVT#readFeatures}. Set to {@link module:ol/Feature~Feature} to get full editing and geometry
 * support at the cost of decreased rendering performance. The default is
 * {@link module:ol/render/Feature~RenderFeature}, which is optimized for rendering and hit detection.
 * @property {string} [geometryName='geometry'] Geometry name to use when creating features.
 * @property {string} [layerName='layer'] Name of the feature attribute that holds the layer name.
 * @property {Array<string>} [layers] Layers to read features from. If not provided, features will be read from all
 * @property {string} [idProperty] Optional property that will be assigned as the feature id and removed from the properties.
 * layers.
 */
/**
 * @classdesc
 * Feature format for reading data in the Mapbox MVT format.
 *
 * @param {Options} [opt_options] Options.
 * @api
 */
var MVT = /** @class */ (function (_super) {
    __extends(MVT, _super);
    /**
     * @param {Options} [opt_options] Options.
     */
    function MVT(opt_options) {
        var _this = _super.call(this) || this;
        var options = opt_options ? opt_options : {};
        /**
         * @type {Projection}
         */
        _this.dataProjection = new Projection({
            code: '',
            units: Units.TILE_PIXELS,
        });
        /**
         * @private
         * @type {import("../Feature.js").FeatureClass}
         */
        _this.featureClass_ = options.featureClass
            ? options.featureClass
            : RenderFeature;
        /**
         * @private
         * @type {string|undefined}
         */
        _this.geometryName_ = options.geometryName;
        /**
         * @private
         * @type {string}
         */
        _this.layerName_ = options.layerName ? options.layerName : 'layer';
        /**
         * @private
         * @type {Array<string>|null}
         */
        _this.layers_ = options.layers ? options.layers : null;
        /**
         * @private
         * @type {string}
         */
        _this.idProperty_ = options.idProperty;
        _this.supportedMediaTypes = [
            'application/vnd.mapbox-vector-tile',
            'application/x-protobuf',
        ];
        return _this;
    }
    /**
     * Read the raw geometry from the pbf offset stored in a raw feature's geometry
     * property.
     * @param {PBF} pbf PBF.
     * @param {Object} feature Raw feature.
     * @param {Array<number>} flatCoordinates Array to store flat coordinates in.
     * @param {Array<number>} ends Array to store ends in.
     * @private
     */
    MVT.prototype.readRawGeometry_ = function (pbf, feature, flatCoordinates, ends) {
        pbf.pos = feature.geometry;
        var end = pbf.readVarint() + pbf.pos;
        var cmd = 1;
        var length = 0;
        var x = 0;
        var y = 0;
        var coordsLen = 0;
        var currentEnd = 0;
        while (pbf.pos < end) {
            if (!length) {
                var cmdLen = pbf.readVarint();
                cmd = cmdLen & 0x7;
                length = cmdLen >> 3;
            }
            length--;
            if (cmd === 1 || cmd === 2) {
                x += pbf.readSVarint();
                y += pbf.readSVarint();
                if (cmd === 1) {
                    // moveTo
                    if (coordsLen > currentEnd) {
                        ends.push(coordsLen);
                        currentEnd = coordsLen;
                    }
                }
                flatCoordinates.push(x, y);
                coordsLen += 2;
            }
            else if (cmd === 7) {
                if (coordsLen > currentEnd) {
                    // close polygon
                    flatCoordinates.push(flatCoordinates[currentEnd], flatCoordinates[currentEnd + 1]);
                    coordsLen += 2;
                }
            }
            else {
                assert(false, 59); // Invalid command found in the PBF
            }
        }
        if (coordsLen > currentEnd) {
            ends.push(coordsLen);
            currentEnd = coordsLen;
        }
    };
    /**
     * @private
     * @param {PBF} pbf PBF
     * @param {Object} rawFeature Raw Mapbox feature.
     * @param {import("./Feature.js").ReadOptions} options Read options.
     * @return {import("../Feature.js").FeatureLike|null} Feature.
     */
    MVT.prototype.createFeature_ = function (pbf, rawFeature, options) {
        var type = rawFeature.type;
        if (type === 0) {
            return null;
        }
        var feature;
        var values = rawFeature.properties;
        var id;
        if (!this.idProperty_) {
            id = rawFeature.id;
        }
        else {
            id = values[this.idProperty_];
            delete values[this.idProperty_];
        }
        values[this.layerName_] = rawFeature.layer.name;
        var flatCoordinates = /** @type {Array<number>} */ ([]);
        var ends = /** @type {Array<number>} */ ([]);
        this.readRawGeometry_(pbf, rawFeature, flatCoordinates, ends);
        var geometryType = getGeometryType(type, ends.length);
        if (this.featureClass_ === RenderFeature) {
            feature = new this.featureClass_(geometryType, flatCoordinates, ends, values, id);
            feature.transform(options.dataProjection);
        }
        else {
            var geom = void 0;
            if (geometryType == 'Polygon') {
                var endss = inflateEnds(flatCoordinates, ends);
                geom =
                    endss.length > 1
                        ? new MultiPolygon(flatCoordinates, GeometryLayout.XY, endss)
                        : new Polygon(flatCoordinates, GeometryLayout.XY, ends);
            }
            else {
                geom =
                    geometryType === 'Point'
                        ? new Point(flatCoordinates, GeometryLayout.XY)
                        : geometryType === 'LineString'
                            ? new LineString(flatCoordinates, GeometryLayout.XY)
                            : geometryType === 'MultiPoint'
                                ? new MultiPoint(flatCoordinates, GeometryLayout.XY)
                                : geometryType === 'MultiLineString'
                                    ? new MultiLineString(flatCoordinates, GeometryLayout.XY, ends)
                                    : null;
            }
            var ctor = /** @type {typeof import("../Feature.js").default} */ (this.featureClass_);
            feature = new ctor();
            if (this.geometryName_) {
                feature.setGeometryName(this.geometryName_);
            }
            var geometry = transformGeometryWithOptions(geom, false, options);
            feature.setGeometry(geometry);
            if (id !== undefined) {
                feature.setId(id);
            }
            feature.setProperties(values, true);
        }
        return feature;
    };
    /**
     * @return {import("./Feature.js").Type} Format.
     */
    MVT.prototype.getType = function () {
        return 'arraybuffer';
    };
    /**
     * Read all features.
     *
     * @param {ArrayBuffer} source Source.
     * @param {import("./Feature.js").ReadOptions} [opt_options] Read options.
     * @return {Array<import("../Feature.js").FeatureLike>} Features.
     * @api
     */
    MVT.prototype.readFeatures = function (source, opt_options) {
        var layers = this.layers_;
        var options = /** @type {import("./Feature.js").ReadOptions} */ (this.adaptOptions(opt_options));
        var dataProjection = get(options.dataProjection);
        dataProjection.setWorldExtent(options.extent);
        options.dataProjection = dataProjection;
        var pbf = new PBF(/** @type {ArrayBuffer} */ (source));
        var pbfLayers = pbf.readFields(layersPBFReader, {});
        var features = [];
        for (var name_1 in pbfLayers) {
            if (layers && layers.indexOf(name_1) == -1) {
                continue;
            }
            var pbfLayer = pbfLayers[name_1];
            var extent = pbfLayer ? [0, 0, pbfLayer.extent, pbfLayer.extent] : null;
            dataProjection.setExtent(extent);
            for (var i = 0, ii = pbfLayer.length; i < ii; ++i) {
                var rawFeature = readRawFeature(pbf, pbfLayer, i);
                var feature = this.createFeature_(pbf, rawFeature, options);
                if (feature !== null) {
                    features.push(feature);
                }
            }
        }
        return features;
    };
    /**
     * Read the projection from the source.
     *
     * @param {Document|Element|Object|string} source Source.
     * @return {import("../proj/Projection.js").default} Projection.
     * @api
     */
    MVT.prototype.readProjection = function (source) {
        return this.dataProjection;
    };
    /**
     * Sets the layers that features will be read from.
     * @param {Array<string>} layers Layers.
     * @api
     */
    MVT.prototype.setLayers = function (layers) {
        this.layers_ = layers;
    };
    return MVT;
}(FeatureFormat));
/**
 * Reader callback for parsing layers.
 * @param {number} tag The tag.
 * @param {Object} layers The layers object.
 * @param {PBF} pbf The PBF.
 */
function layersPBFReader(tag, layers, pbf) {
    if (tag === 3) {
        var layer = {
            keys: [],
            values: [],
            features: [],
        };
        var end = pbf.readVarint() + pbf.pos;
        pbf.readFields(layerPBFReader, layer, end);
        layer.length = layer.features.length;
        if (layer.length) {
            layers[layer.name] = layer;
        }
    }
}
/**
 * Reader callback for parsing layer.
 * @param {number} tag The tag.
 * @param {Object} layer The layer object.
 * @param {PBF} pbf The PBF.
 */
function layerPBFReader(tag, layer, pbf) {
    if (tag === 15) {
        layer.version = pbf.readVarint();
    }
    else if (tag === 1) {
        layer.name = pbf.readString();
    }
    else if (tag === 5) {
        layer.extent = pbf.readVarint();
    }
    else if (tag === 2) {
        layer.features.push(pbf.pos);
    }
    else if (tag === 3) {
        layer.keys.push(pbf.readString());
    }
    else if (tag === 4) {
        var value = null;
        var end = pbf.readVarint() + pbf.pos;
        while (pbf.pos < end) {
            tag = pbf.readVarint() >> 3;
            value =
                tag === 1
                    ? pbf.readString()
                    : tag === 2
                        ? pbf.readFloat()
                        : tag === 3
                            ? pbf.readDouble()
                            : tag === 4
                                ? pbf.readVarint64()
                                : tag === 5
                                    ? pbf.readVarint()
                                    : tag === 6
                                        ? pbf.readSVarint()
                                        : tag === 7
                                            ? pbf.readBoolean()
                                            : null;
        }
        layer.values.push(value);
    }
}
/**
 * Reader callback for parsing feature.
 * @param {number} tag The tag.
 * @param {Object} feature The feature object.
 * @param {PBF} pbf The PBF.
 */
function featurePBFReader(tag, feature, pbf) {
    if (tag == 1) {
        feature.id = pbf.readVarint();
    }
    else if (tag == 2) {
        var end = pbf.readVarint() + pbf.pos;
        while (pbf.pos < end) {
            var key = feature.layer.keys[pbf.readVarint()];
            var value = feature.layer.values[pbf.readVarint()];
            feature.properties[key] = value;
        }
    }
    else if (tag == 3) {
        feature.type = pbf.readVarint();
    }
    else if (tag == 4) {
        feature.geometry = pbf.pos;
    }
}
/**
 * Read a raw feature from the pbf offset stored at index `i` in the raw layer.
 * @param {PBF} pbf PBF.
 * @param {Object} layer Raw layer.
 * @param {number} i Index of the feature in the raw layer's `features` array.
 * @return {Object} Raw feature.
 */
function readRawFeature(pbf, layer, i) {
    pbf.pos = layer.features[i];
    var end = pbf.readVarint() + pbf.pos;
    var feature = {
        layer: layer,
        type: 0,
        properties: {},
    };
    pbf.readFields(featurePBFReader, feature, end);
    return feature;
}
/**
 * @param {number} type The raw feature's geometry type
 * @param {number} numEnds Number of ends of the flat coordinates of the
 * geometry.
 * @return {import("../geom/Geometry.js").Type} The geometry type.
 */
function getGeometryType(type, numEnds) {
    /** @type {import("../geom/Geometry.js").Type} */
    var geometryType;
    if (type === 1) {
        geometryType = numEnds === 1 ? 'Point' : 'MultiPoint';
    }
    else if (type === 2) {
        geometryType = numEnds === 1 ? 'LineString' : 'MultiLineString';
    }
    else if (type === 3) {
        geometryType = 'Polygon';
        // MultiPolygon not relevant for rendering - winding order determines
        // outer rings of polygons.
    }
    return geometryType;
}
export default MVT;
//# sourceMappingURL=MVT.js.map