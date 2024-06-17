import React, { useState } from "react";
import { color } from "d3";

export const StrokeComponent = (props) => {
  //Dynamically updates color mode and type
  let nodes_properties = props.nodes_properties;

  //Put a border when the ramp is clicked (or one of its children nodes)
  function selectColorRamp(e) {
    document.getElementById("linkColorAlertMessage").innerHTML = "";
    document
      .querySelectorAll(".linkSelectedRamp")
      .forEach((el) => el.classList.remove("linkSelectedRamp"));

    //Select a ramp on click on the ramp, the rectangles and the svg elements
    let clickedElement = e.target;
    if (clickedElement.nodeName === "rect") {
      clickedElement.parentNode.parentNode.classList.add("linkSelectedRamp");
    } else if (clickedElement.nodeName === "svg") {
      clickedElement.parentNode.classList.add("linkSelectedRamp");
    } else {
      clickedElement.classList.add("linkSelectedRamp");
    }
  }

  //Parses a string and returns NaN if it's not convertible into a float (stricter than parseFloat())
  function filter_float(value) {
    if (/^(\-|\+)?([0-9]+(\.[0-9]+)?|Infinity)$/.test(value))
      return Number(value);
    return NaN;
  }

  //Both color menu and container change according to the color mode (fixed or varied)
  let color_container;
 

    color_container = (
        <input
            id="nodeSingleColorStrokePicker"
            type="color"
            defaultValue={props.semio.stroke.color}
        ></input>
    );
  

  return (
    <div class="row" id="NodesSemioStrokeRow">
          <div class="col-md-2">
              <label class="text-muted h5">Color</label><br></br>
      {color_container}
          </div>
          <div id="semioStrokeSizeChangeNode" class="col-md-3">
              <label class="text-muted h5">Size</label>
              <input
                  class="form-control"
                  id="sizeStrokeNode"
                  min="0"
                  step="0.05"
                  max="100"
                  type="number"
                  defaultValue={props.semio.stroke.size}
              ></input>
              <div class="invalid-feedback">Enter a value between 0 and 1 </div>
          </div>
      </div>
  );
};