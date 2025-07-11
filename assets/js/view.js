import React from 'react';
import ReactDOM from 'react-dom';
import { NodesSemioModalComponent } from '../react/nodes_semio/node_semio_modal';
import { LinksSemioModalComponent } from '../react/links_semio/link_semio_modal';
import { LinksShapeModalComponent } from '../react/links_shape_semio';
import { LayerSemioModal } from '../react/layers/layer_semio_modal';
import { LegendComponent } from '../react/legend/legend';
import { NewFilterModal } from '../react/filters/filters_modal';

export default class View {
  constructor(renderer, model) {
    this.renderer = renderer;
    this.model = model;

    this.body = document.getElementsByTagName('body')[0];
    this.home = document.getElementById('home');

    this.map_container = document.getElementById('map');

    // modal import nodes
    this.ModalImportNodes = document.getElementById('ModalImportNodes');
    this.import_nodes_modal = require('../hbs/import-nodes-modal.hbs');
    this.ModalImportNodes.innerHTML = this.import_nodes_modal();

    // modal import presets nodes
    this.ModalImportPresetsNodes = document.getElementById(
      'ModalImportPresets'
    );
    this.import_presets_modal = require('../hbs/import-preset-nodes-modal.hbs');
    this.ModalImportPresetsNodes.innerHTML = this.import_presets_modal();

    // modal import links
    this.ModalImportLinks = document.getElementById('ModalImportLinks');
    this.import_links_modal = require('../hbs/import-links-modal.hbs');
    this.ModalImportLinks.innerHTML = this.import_links_modal();

    // modal import stats
    this.ModalImportStats = document.getElementById('ModalImportStats');
    this.import_stats_modal = require('../hbs/import-stats-modal.hbs');
  }

  import_nodes() {
    document.getElementById('NodesFileError').innerHTML = '';
    document.getElementById('NodesLatSelect').style.visibility = 'hidden';
    document.getElementById('NodesLongSelect').style.visibility = 'hidden';
    document.getElementById('NodesFeaturesSelects').style.visibility = 'hidden';
    document.getElementById('NodesFileLabel').innerHTML = 'Nodes data File';
    document.getElementById('NodesImportFile').value = '';
    $('#importNodesModal').modal();
  }
  import_presets() {
    $('#importPresetNodesModal').modal();
  }
  update_preset_selection(id) {
    document.getElementById('NodesPresets').style.visibility = 'visible';

    document.getElementById('highLevel').style.visibility = 'visible';

    let hiddingElement = document.getElementsByClassName('custom-selectPreset'); // document.getElementsByClassName("custom-select").style.visibility = "hidden";
    hiddingElement.forEach((element) => {
      element.style.display = 'none';
    });
    document.getElementById(id).style.display = 'block';
    // document.getElementById("ImportNodesPreset").disabled = false;
  }

  update_preset_world_selection(id) {
    document.getElementById('idSelection').style.visibility = 'visible';

    let hiddingElement = document.getElementsByClassName('custom-selectPreset'); // document.getElementsByClassName("custom-select").style.visibility = "hidden";
    hiddingElement.forEach((element) => {
      element.style.display = 'none';
    });
    document.getElementById(
      document.querySelector('input[name="NodesImportPresetFile"]:checked')
        .value
    ).style.display = 'block';
    document.getElementById(id).style.display = 'block';
    document.getElementById('ImportNodesPreset').disabled = false;
  }

  set_nodes_file_name(filename) {
    document.getElementById('NodesFileLabel').innerHTML = filename;
  }
  update_import_csv() {
    document.getElementById('NodesLatSelect').style.visibility = 'visible';
    document.getElementById('NodesLongSelect').style.visibility = 'visible';
  }
  update_import_nodes_modal(nodefeatures) {
    //Set selected option according to input

    let opts_id = nodefeatures
      .map((f) => {
        if (nodefeatures.indexOf(f) === 0) {
          return '<option selected>' + f + '</option>';
        } else {
          return '<option>' + f + '</option>';
        }
      })
      .join('');

    let opts_lat = nodefeatures
      .map((f) => {
        if (f.startsWith('lat')) {
          return '<option selected>' + f + '</option>';
        } else {
          return '<option>' + f + '</option>';
        }
      })
      .join('');

    let opts_long = nodefeatures
      .map((f) => {
        if (f.startsWith('lon')) {
          return '<option selected>' + f + '</option>';
        } else {
          return '<option>' + f + '</option>';
        }
      })
      .join('');

    document.getElementById('NodesFileError').innerHTML = '';
    document.getElementById('NodesFeaturesSelects').style.visibility =
      'visible';
    document.getElementById('NodeImportID').innerHTML = opts_id;
    document.getElementById('NodeImportLat').innerHTML = opts_lat;
    document.getElementById('NodeImportLong').innerHTML = opts_long;
    document.getElementById('ImportNodes').disabled = false;
  }
  error_nodes_file(evt) {
    document.getElementById('NodesFileError').innerHTML =
      '<b>An error occured during file parsing (check its structure and content)</b>';
  }

  import_links() {
    document.getElementById('LinksFileError').innerHTML = '';
    document.getElementById('LinksFeaturesSelects').style.visibility = 'hidden';
    document.getElementById('LinksFileLabel').innerHTML = 'Flows data File';
    document.getElementById('LinksImportFile').value = '';
    $('#importLinksModal').modal();
  }
  set_links_file_name(filename) {
    document.getElementById('LinksFileLabel').innerHTML = filename;
  }

  // reveal link modal inputs and insert options in them
  update_import_links_modal(linkfeatures) {
    let opts_origin = linkfeatures
      .map((f) => {
        if (linkfeatures.indexOf(f) === 0) {
          return '<option selected>' + f + '</option>';
        } else {
          return '<option>' + f + '</option>';
        }
      })
      .join('');

    let opts_dest = linkfeatures
      .map((f) => {
        if (linkfeatures.indexOf(f) === 1) {
          return '<option selected>' + f + '</option>';
        } else {
          return '<option>' + f + '</option>';
        }
      })
      .join('');

    let opts_volume = linkfeatures
      .map((f) => {
        if (linkfeatures.indexOf(f) === 2) {
          return '<option selected>' + f + '</option>';
        } else {
          return '<option>' + f + '</option>';
        }
      })
      .join('');

    document.getElementById('LinksFileError').innerHTML = '';
    document.getElementById('LinksFeaturesSelects').style.visibility =
      'visible';
    document.getElementById('LinksImportOrigineID').innerHTML = opts_origin;
    document.getElementById('LinksImportDestinationID').innerHTML = opts_dest;
    document.getElementById('LinksImportVolume').innerHTML = opts_volume;
    document.getElementById('ImportLinks').disabled = false;
  }
  error_links_file(evt) {
    document.getElementById('LinksFileError').innerHTML =
      '<b>An error occured during file parsing (check its structure and content)</b>';
  }
  error_zip_file(evt) {
    console.log(evt);
  }

  import_end(import_stats, nodes, links, config, link_data_range) {
    this.ModalImportStats.innerHTML = this.import_stats_modal(import_stats);
    $('#importStatsModal').modal();

    this.home.style.display = 'none';
    this.map_container.style.display = 'block';
    this.renderer.fresh();

    //Already done in renderer.set_projection() !
    let nstyle = config.styles.nodes;
    let lstyle = config.styles.links;
    this.renderer.add_nodes(nodes, nstyle);

    this.renderer.add_links(
      links,
      lstyle,
      link_data_range,
      config.layers,
      config.zoom,
      config.center,
      true
    );
  }
  set_projection(proj, nodes, links, config, link_data_range) {
    this.renderer.set_projection(proj, nodes, links, config, link_data_range);
  }

  update_nodes_semio(semio, nodes_properties, callback) {
    ReactDOM.render(
      <NodesSemioModalComponent
        semio={semio}
        nodes_properties={nodes_properties}
        update_semio={(new_semio) => callback(new_semio)}
      />,
      document.getElementById('ModalSemioNodes')
    );
    // this.ModalSemioNodes.innerHTML = this.semio_nodes_modal(semio);
    $('#semioNodes').modal();
  }
  update_links_semio(semio, links_properties, callback) {
    ReactDOM.render(
      <LinksSemioModalComponent
        semio={semio}
        links_properties={links_properties}
        update_semio={(new_semio) => callback(new_semio)}
      />,
      document.getElementById('ModalSemioLinks')
    );

    $('#semioLinks').modal();
  }
  update_links_shape(lstyle, callback) {
    ReactDOM.render(
      <LinksShapeModalComponent
        semio={lstyle}
        update_shape={(new_semio) => callback(new_semio)}
      />,
      document.getElementById('ModalShapeLinks')
    );
    $('#changeGeometryModal').modal();
  }
  update_geojson_semio(layer_name, gstyle, callback) {
    ReactDOM.render(
      <LayerSemioModal
        layer_name={layer_name}
        semio={gstyle}
        update_geojson={(layer_name, new_semio) =>
          callback(layer_name, new_semio)
        }
      />,
      document.getElementById('ModalSemioLayer')
    );
    $('#changeLayerSemioModal').modal();

    //Setting color pickers values
    document.getElementById('fillColorpickerChange').value = gstyle.fill;
    document.getElementById('layerStrokeColorPickerChange').value =
      gstyle.border;
    document.getElementById('opacityLayerChange').value = gstyle.opacity;
  }

  render_legend(
    nodes,
    nodes_hash,
    nstyle,
    links,
    links_hash,
    lstyle,
    toggle_legend
  ) {
    ReactDOM.render(
      <LegendComponent
        nstyle={nstyle}
        nodes={nodes}
        lstyle={lstyle}
        links={links}
        nodes_hash={nodes_hash}
        links_hash={links_hash}
        node_size_scale={this.renderer._scale_node_size}
        link_size_scale={this.renderer._scale_link_size}
        map={this.renderer.map}
        toggle_legend={toggle_legend}
      />,
      document.getElementById('legendDiv')
    );
  }

  new_filter(nodes_properties, links_properties, callback) {
    console.log(links_properties);
    ReactDOM.render(
      <NewFilterModal
        nodes_properties={nodes_properties}
        links_properties={links_properties}
        add_filter={callback}
      />,
      document.getElementById('ModalNewFilter')
    );
  }
}
