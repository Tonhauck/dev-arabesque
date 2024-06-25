import React, { useState } from "react";

export const NewFilterModal = (props) => {
  const [targetLayer, setTargetLayer] = useState("links");
  const [variable, setVariable] = useState("origin");

  function save_and_close(e) {
    e.preventDefault();
    e.stopPropagation();

    const selectedVariable = document.getElementById("filterVariableSelect").value;
    const filterType = document.getElementById("filterTypeSelect").value;

    props.add_filter(targetLayer, selectedVariable, filterType);

  }

  function handleTargetLayerChange(e) {
    setTargetLayer(e.target.value);
    // Reset variable to a default value based on new target layer
    const newVariable = e.target.value === "links" ? "origin" : Object.keys(props.nodes_properties)[0];
    setVariable(newVariable);
  }

  function handleVariableChange(e) {
    setVariable(e.target.value);
  }

  // Generate variable select options and type options based on the selected target layer
  let variableSelect, typeOptions;
  if (targetLayer === "links") {
    variableSelect = (
      <div className="col-md-4">
        <label htmlFor="filterVariableSelect">Variable</label>
        <select
          className="custom-select"
          id="filterVariableSelect"
          value={variable}
          onChange={handleVariableChange}
        >
          {Object.entries(props.links_properties).map(([key]) => (
            <option key={key} value={key}>
              {key}
            </option>
          ))}
        </select>
      </div>
    );

    typeOptions = isNaN(props.links_properties[variable])
      ? [{ value: "categorial", label: "Categorial" }]
      : [
        { value: "categorial", label: "Categorial" },
        { value: "discrete", label: "Discrete" },
        { value: "continuous", label: "Continuous" },
      ];
  } else if (targetLayer === "nodes") {
    variableSelect = (
      <div className="col-md-4">
        <label htmlFor="filterVariableSelect">Variable</label>
        <select
          className="custom-select"
          id="filterVariableSelect"
          value={variable}
          onChange={handleVariableChange}
        >
          {Object.keys(props.nodes_properties).map((key) => (
            <option key={key} value={key}>
              {key}
            </option>
          ))}
        </select>
      </div>
    );

    typeOptions = isNaN(props.nodes_properties[variable])
      ? [{ value: "categorial", label: "Categorial" }]
      : [
        { value: "categorial", label: "Categorial" },
        { value: "discrete", label: "Discrete" },
        { value: "continuous", label: "Continuous" },
      ];
  }

  return (
    <div
      className="modal fade show"
      id="FilterModal"
      tabIndex="-1"
      role="dialog"
      aria-labelledby="exampleModalLabel"
      style={{ display: "block" }}
      aria-modal="true"
      aria-hidden="true"
      data-backdrop="true"
    >
      <div className="modal-dialog" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" id="exampleModalLabel">
              New Filter
            </h5>
          </div>
          <div className="modal-body" id="filterLayerBody">
            <div className="row">
              <div className="col-md-4">
                <label htmlFor="filteredLayer">Layer</label>
                <select
                  className="custom-select"
                  id="filteredLayer"
                  value={targetLayer}
                  onChange={handleTargetLayerChange}
                >
                  <option value="links">Links</option>
                {/*   <option value="nodes">Nodes</option> */}
                </select>
              </div>
              {variableSelect}
              <div className="col-md-4">
                <label htmlFor="filterTypeSelect">
                  Type
                  <img
                    className="small-icon"
                    data-html="true"
                    data-container="body"
                    data-toggle="popover"
                    data-placement="right"
                    data-content="- Categorial => qualitative selector  <br />- Remove => qualitative removal <br /> - One Category => quick selector of one category <br />  - Numeral => quantitative selector <br /> Temporal => Select time area (must precise a time format)"
                    title=""
                    src="./assets/svg/si-glyph-circle-info.svg"
                    data-original-title="Select the type of filter:"
                  ></img>
                </label>
                <select className="custom-select" id="filterTypeSelect">
                  {typeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <div className="invalid-feedback">
                  A filter already exists for these parameters
                </div>
              </div>
            </div>
          </div>
          <button
            className="modal-footer btn btn-dark justify-content-center mt-2"
            type="button"
            id="addFilterButton"
            onClick={save_and_close}
          >
            ADD FILTER
          </button>
        </div>
      </div>
    </div>
  );
};
