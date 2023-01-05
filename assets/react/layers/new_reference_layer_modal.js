import React, { useState } from "react";

export const NewReferenceLayerModal = (props) => {
    console.log(props);
    function save_and_close_reference(e) {
        e.preventDefault();
        e.stopPropagation();
        //Getting the loaded file
        // const file = document.getElementById("geoJson").files[0];

        const opacity = document.getElementById("opacityGeoJson").value;
        const fill = document.getElementById("fillColorpickerGeoJson").value;
        const border_color = document.getElementById("strokeColorpickerGeoJson")
            .value;
        const config = { fill: fill, border: border_color, opacity: opacity };
        //Extracting data from the file


        var select = document.getElementById('referenceLayersNameSelectorOptions');
        var value = select.options[select.selectedIndex].value;
        console.log(value)
        let nodesGeojsonPreset = "../../../public/data/reference_layer/" + value + ".geojson";

        fetch(nodesGeojsonPreset)
            .then(response => response.json())
            .then(json =>

                //Dealing with unsupported geometries
                config.file = json,
                document.getElementById('geojsonReferenceModal').setAttribute("style", "display:none")
            ).then(json => props.save_layer("geojson", value, config))

    }
    function close_reference(e) {
        document.getElementById('geojsonReferenceModal').setAttribute("style", "display:none")
    }
    return (
        <div
            class="modal fade show"
            id="geojsonReferenceModal"
            tabindex="-1"
            role="dialog"
            aria-labelledby="geojsonReferenceModalLabel"
            style={{ display: "block", ariaModal: "true" }}
            aria-modal="true"
            aria-hidden="true"
            data-backdrop="true"
        >
            <div class="modal-dialog" role="document">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="geojsonReferenceModalLabel">
                            {" "}
                            Import Reference
                        </h5>
                        <button
                            type="button"
                            class="close"
                            id='closeRef'
                            aria-label="Close"
                            onClick={close_reference}
                        >
                            <span aria-hidden="true">×</span>
                        </button>
                    </div>
                    <div class="modal-body" id="geoJsonReferenceModalBody">
                        <div class="row">
                            {/*   <div class="col-md-6">
                <label class="text-muted h5">Type</label>
                <select class="custom-select w-100" id="tileLayersAdd">
                  <option value="base">Base</option>
                  <option value="overlay">Overlay</option>
                  <option value="stamen">Stamen Map</option>
                  CARTO basemap
                  <option value="text">Text Tile</option>
                  <option value="carto">CARTO basemap</option>
                </select>
              </div> */}
                            <div class="col-md-6" id="referenceLayersNameSelector">
                                {/* <label class="text-muted h5">Layer</label>
                <select class="custom-select w-100" id="referencelayersAdd">
                  <option selected>Choose...</option>
                </select> */}
                                {/*  <label for="referenceLayersNameSelectorOptions">references</label> */}
                                <select
                                    class="custom-select"
                                    id="referenceLayersNameSelectorOptions"
                                >
                                    <optgroup label="Graticules">
                                        <option value="graticules_5">Graticules 5</option>
                                        <option value="graticules_10">Graticules 10</option>
                                        <option value="graticules_15">Graticules 15</option>
                                        <option value="graticules_20">Graticules 20</option>
                                        <option value="graticules_30">Graticules 30</option>
                                    </optgroup>
                                    <optgroup label="Countries">
                                        <option value="countries_110m">Countries 110m</option>
                                        <option value="countries_50m">Countries 50m</option>
                                        <option value="disputed_areas">Disputed Areas</option>
                                        urban_areas
                                    </optgroup>
                                    <optgroup label="Urban Areas">
                                        <option value="urban_areas_50m">Urban Areas 50m</option>
                                        <option value="urban_areas_10m">Urban Areas 10m</option>
                                    </optgroup>
                                    <optgroup label="Land">
                                        <option value="land_110m">Land 110m</option>
                                        <option value="land_50m">Land 50m</option>
                                    </optgroup>
                                </select>
                                <div class="invalid-feedback">
                                    This layer has already been loaded
                                </div>
                            </div>
                        </div>
                        <hr></hr>
                        <div class="row">
                            <div class="col-md-12">
                                <label class="text-muted h5" for="customRange3">
                                    Opacity
                                </label>
                                <input
                                    type="range"
                                    class="custom-range"
                                    min="0"
                                    max="1"
                                    step="0.05"
                                    id="opacityGeoJson"
                                ></input>
                            </div>
                        </div>
                        <hr></hr>{" "}
                        <div class="row">
                            <div class="col-md-6">
                                <label class="text-muted h5" for="customRange3">
                                    Fill
                                </label>
                                <input
                                    type="color"
                                    id="fillColorpickerGeoJson"
                                    onchange="clickColor(0, -1, -1, 5)"
                                    defaultValue="#ff0000"
                                ></input>
                            </div>
                            <div class="col-md-6">
                                <label class="text-muted h5" for="customRange3">
                                    Stroke
                                </label>
                                <input
                                    type="color"
                                    id="strokeColorpickerGeoJson"
                                    onchange="clickColor(0, -1, -1, 5)"
                                    defaultValue="#ff0000"
                                ></input>
                            </div>
                        </div>
                    </div>
                    <button
                        class="modal-footer btn btn-dark justify-content-center mt-2"
                        type="button"
                        id="addNewLayerButtonReferenceGeoJson"
                        onClick={save_and_close_reference}
                    >
                        ADD LAYER
                    </button>
                </div>
            </div>
        </div>
    );
};

