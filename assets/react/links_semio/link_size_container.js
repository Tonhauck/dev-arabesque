import React, { useState } from 'react';

export const SizeContainerComponent = (props) => {
  let links_properties = props.links_properties;
  console.log(props);
  let [size_mode, set_size_mode] = useState(props.semio.size.mode);
  let [selectedValue, setSelectedValue] = useState(props.semio.size.varied.var);

  // Quand la valeur change, mettre à jour l'état local et notifier le parent
  const handleValueChange = (value) => {
    setSelectedValue(value);
    props.onSizeVarChange(value);
  };

  //Parses a string and returns NaN if it's not convertible into a float (stricter than parseFloat())
  function filter_float(value) {
    if (/^(\-|\+)?([0-9]+(\.[0-9]+)?|Infinity)$/.test(value))
      return Number(value);
    return NaN;
  }

  function enablePopup() {
    if (document.getElementById('linkSizeRatioIcon') !== null) {
      $('#linkSizeRatioIcon').popover();
    }
    if (document.getElementById('linkSizeWidthIcon') !== null) {
      $('#linkSizeWidthIcon').popover();
    }
  }

  //The size container changes according to the size mode (fixed or varied)
  let size_container;
  if (size_mode === 'fixed') {
    props.notify_state_change('fixed');
    size_container = (
      <div class="row" id="semioSizeChangeLink">
        <div class="col-md-2">
          <label for="select" class="text-muted h5">
            -
          </label>
          <select
            class="custom-select"
            id="semioSizeBaseTypeChangeLink"
            onChange={(e) => set_size_mode(e.target.value)}
            defaultValue={size_mode}
          >
            <option value="fixed">Fixed</option>
            <option value="varied">Varied</option>
          </select>
        </div>
        <div id="semioSizeRatioChangeLink" class="col-md-4">
          <label class="text-muted h5">
            Width{' '}
            <img
              id="linkSizeWidthIcon"
              class="small-icon"
              src="./assets/svg/si-glyph-circle-info.svg"
              data-html="true"
              data-container="body"
              data-toggle="popover"
              data-placement="right"
              data-content="This width is then multiplied by 1000 times the length of the smallest side of the data bounding box"
              onLoad={enablePopup}
            ></img>{' '}
          </label>
          <input
            class="form-control"
            id="ratioMinMaxSizeChangeLink"
            type="number"
            defaultValue={props.semio.size.fixed}
          ></input>
          <div class="invalid-feedback">Enter a width</div>
        </div>
      </div>
    );
  } else if (size_mode === 'varied') {
    props.notify_state_change('varied');
    size_container = (
      <div class="row" id="semioSizeChangeLink">
        <div class="col-md-2">
          <label for="select" class="text-muted h5">
            -
          </label>
          <select
            class="custom-select"
            id="semioSizeBaseTypeChangeLink"
            onChange={(e) => set_size_mode(e.target.value)}
            defaultValue={size_mode}
          >
            <option value="fixed">Fixed</option>
            <option value="varied">Varied</option>
          </select>
        </div>
        <div class="col-md-2">
          <label class="text-muted h5">Variable</label>
          <select
            className="custom-select"
            id="semioSelectorSizeChangeLink"
            value={selectedValue}
            onChange={(e) => handleValueChange(e.target.value)}
          >
            {/* We can iterate on the nodes properties to fill the select div  */}
            {Object.keys(links_properties)
              .filter(
                (p) =>
                  !isNaN(filter_float(links_properties[p])) && // Keep only numeric properties
                  p !== 'value' && // Exclude calculated 'value'
                  p !== 'balance' && // Exclude calculated 'balance'
                  p !== 'grossFlow' && // Exclude calculated 'grossFlow'
                  p !== 'volume' // Exclude calculated 'volume'
              )
              .map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            {/* Explicitly add the calculated/derived properties */}
            <option value="value">value</option>
            <option value="balance">balance</option>
            <option value="grossFlow">grossFlow</option>
            <option value="volume">volume</option>
          </select>
        </div>
        <div id="semioSizeRatioCatChangeLink" class="col-md-4">
          <label class="text-muted h5">Scale</label>
          <select
            class="custom-select"
            id="typeSizeChangeLink"
            defaultValue={props.semio.size.varied.scale}
          >
            <option value="Pow">Square</option>
            <option value="Sqrt">SquareRoot</option>
            <option value="Log">Logarithmic</option>
          </select>
          <div class="invalid-feedback">
            Error : all values must be inferior to 0
          </div>
        </div>
        <div id="semioSizeRatioChangeLink" class="col-md-4">
          <label class="text-muted h5">
            Ratio{' '}
            <img
              class="small-icon"
              src="./assets/svg/si-glyph-circle-info.svg"
              data-html="true"
              data-container="body"
              data-toggle="popover"
              data-placement="right"
              data-content="This ratio is used to calculate the width of the biggest link"
              data-original-title=""
              title=""
              id="linkSizeWidthIcon"
              onLoad={enablePopup}
            ></img>
          </label>
          <input
            class="form-control"
            id="ratioMinMaxSizeChangeLink"
            type="number"
            defaultValue={props.semio.size.varied.maxval}
          ></input>
          <div class="invalid-feedback">Enter a ratio</div>
        </div>
      </div>
    );
  }
  return size_container;
};
