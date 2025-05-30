import BarChartFilter from './barchartfilter.js';
import { CategorialFilter } from '../react/filters/categorial_filter';
import { NewTileLayerModal } from '../react/layers/new_tile_layer_modal';
import { NewGeojsonLayerModal } from '../react/layers/new_geojson_layer_modal';
import { NewReferenceLayerModal } from '../react/layers/new_reference_layer_modal';
import ReactDOM from 'react-dom';
import React from 'react';
import * as turf from '@turf/turf';
import { LayerCardsContainer } from '../react/layers/layers_container';
import crossfilter from 'crossfilter2';
import { data } from 'jquery';

export default class Controller {
  constructor(model, view) {
    this.model = model;
    this.view = view;

    /*  // Vérifier et charger les données depuis IndexedDB au démarrage
        this.loadDataFromIndexedDB((data) => {
            if (data) {
                console.log("Données chargées depuis IndexedDB:", data);
                this.model.importExternalData(data);
                this.render_all();
            } else {
                console.log("Aucune donnée trouvée dans IndexedDB.");
            }
        }); */

    window.addEventListener('message', (event) => {
      const data = event.data;
      if (data.type === 'arabesqueData') {
        // Afficher le spinner d'attente
        document.getElementById('spinnerDiv').style.display = 'flex';
        // Ajouter un léger délai pour éviter que l'application ne se déclenche avant l'import des data
        setTimeout(() => {
          this.handleExternalData(data.content);
        }, 500);
      }
    });

    this.render_layers_cards();

    document
      .getElementById('ImportPreset')
      .addEventListener('click', this.import_preset.bind(this));
    document
      .getElementById('logo-arabesque')
      .addEventListener('click', this.import_go_back.bind(this));
    document
      .getElementById('ImportData')
      .addEventListener('click', this.import_handler.bind(this));
    document
      .getElementById('NodesImportFile')
      .addEventListener('change', this.import_nodes_file.bind(this));
    document
      .getElementById('world_level')
      .addEventListener('change', this.import_id_preset_world.bind(this));
    document
      .getElementById('european_level')
      .addEventListener('change', this.import_id_preset_world.bind(this));
    document
      .getElementById('national_level')
      .addEventListener('change', this.import_id_preset_world.bind(this));
    document
      .getElementById('NodesPresetFile')
      .addEventListener('change', this.import_preset_file.bind(this));
    document
      .getElementById('ImportNodes')
      .addEventListener('click', this.import_nodes.bind(this));
    document
      .getElementById('ImportNodesPreset')
      .addEventListener('click', this.import_nodes_preset.bind(this));
    document
      .getElementById('LinksImportFile')
      .addEventListener('change', this.import_links_file.bind(this));
    document
      .getElementById('ImportLinks')
      .addEventListener('click', this.import_links.bind(this));
    document
      .getElementById('ImportZip')
      .addEventListener('change', this.import_zip.bind(this));
    document
      .getElementById('ExportMap')
      .addEventListener('click', this.model.export.bind(this.model));

    this.load_projections();
    document
      .getElementById('projection')
      .addEventListener('change', this.set_projection.bind(this));

    document
      .getElementById('legendButton')
      .addEventListener('click', this.toggle_legend.bind(this));

    document
      .getElementById('selectFilterButton')
      .addEventListener('click', this.toggle_new_filter_modal.bind(this));

    document
      .getElementById('thumbnail-card')
      .addEventListener('click', this.load_thumbnail_zip.bind(this));

    document
      .getElementById('Filters')
      .addEventListener('change', this.update_stats.bind(this));

    for (let button of document.getElementsByClassName('addLayerButton'))
      button.addEventListener('click', this.addLayer.bind(this));
    let that = this;
    //Chaque fois que le niveau de zoom change, nous mettons à jour la légende + center et zoom
    this.view.renderer.map.on('moveend', () => {
      this.render_legend();
      let view = this.view.renderer.map.getView();
      that.model.config.center = view.getCenter();
      that.model.config.zoom = view.getZoom();
    });

    this.charts = [];
  }

  loadDataFromIndexedDB(callback) {
    let request = indexedDB.open('ArabesqueDB', 1);

    request.onsuccess = function (event) {
      let db = event.target.result;
      let transaction = db.transaction(['dataStore'], 'readonly');
      let objectStore = transaction.objectStore('dataStore');
      let getRequest = objectStore.get('arabesqueData');

      getRequest.onsuccess = function (event) {
        if (getRequest.result) {
          callback(getRequest.result.data);
        } else {
          callback(null);
        }
      };

      getRequest.onerror = function (event) {
        console.error(
          "Erreur lors de la récupération des données de l'indexDB:",
          event
        );
        callback(null);
      };
    };

    request.onerror = function (event) {
      console.error("Erreur lors de l'accès à l'indexDB:", event);
      callback(null);
    };
  }

  import_go_back() {
    location.reload();
  }

  import_preset() {
    this.view.import_presets();
  }

  import_preset_file() {
    let id = document.querySelector(
      'input[name="NodesImportPresetFile"]:checked'
    ).value;
    this.view.update_preset_selection(id);
  }

  import_handler() {
    this.view.import_nodes();
  }

  import_nodes_file() {
    let nodesfile = document.getElementById('NodesImportFile').files[0];
    this.view.set_nodes_file_name(nodesfile.name);
    if (nodesfile.type === 'text/csv') {
      this.view.update_import_csv();
    }
    this.model
      .preprocess_nodes(nodesfile, this.view.update_import_nodes_modal)
      .catch(this.view.error_nodes_file());
  }

  import_nodes() {
    let nodesfile = document.getElementById('NodesImportFile').files[0];

    let id, lat, long;
    if (nodesfile.type === 'text/csv') {
      id = document.getElementById('NodeImportID').value.replace(/\"/g, '');
      lat = document.getElementById('NodeImportLat').value.replace(/\"/g, '');
      long = document.getElementById('NodeImportLong').value.replace(/\"/g, '');
    }
    //If nodes is in geojson format, there is no proper varname
    else {
      id = document.getElementById('NodeImportID').value.replace(/\"/g, '');
      lat = null;
      long = null;
    }

    //Delete "" from values (they are already strings)

    this.model.set_nodes_varnames(id, lat, long);
    this.model
      .import_nodes(nodesfile, this.view.import_links)
      .catch(this.view.error_nodes_file());
  }

  import_id_preset_world() {
    let id = document.getElementById(
      document.querySelector('input[name="NodesImportPresetFile"]:checked')
        .value
    ).value;
    this.view.update_preset_world_selection(id + 'ID');
  }

  // ANCHOR NODE PRESET IMPORT
  import_nodes_preset() {
    // When a level is select, we import the value
    let level = document.querySelector(
      'input[name="NodesImportPresetFile"]:checked'
    ).value;

    let dataset = document.getElementById(level).value;

    let nodeId = document.getElementById(dataset + 'ID').value;

    // The previous inputs are needing to get the correct file.
    let nodesGeojsonPreset =
      './public/arabesque-datasets-presets/geom/' +
      level +
      '/' +
      dataset +
      '.geojson';
    fetch(nodesGeojsonPreset)
      .then((response) => response.json())
      .then((json) =>
        json.features.forEach((f) => {
          //reverse long and lat
          f.geometry = turf.centroid(f.geometry).geometry;
          //reverse long and lat
          let long = f.geometry.coordinates[0];
          let lat = f.geometry.coordinates[1];
          f.geometry.coordinates = [lat, long];
          this.model.data.nodes.push(f);
        })
      )
      .then(
        this.model.set_nodes_varnames(nodeId, null, null),
        this.view.import_links()
      );
  }

  import_links_file() {
    let linksfile = document.getElementById('LinksImportFile').files[0];
    this.view.set_links_file_name(linksfile.name);
    this.model
      .preprocess_links(linksfile, this.view.update_import_links_modal)
      .catch(this.view.error_links_file());
  }
  import_links() {
    let linksfile = document.getElementById('LinksImportFile').files[0];

    //Delete "" from values (they are already strings)
    let origin_id = document
      .getElementById('LinksImportOrigineID')
      .value.replace(/\"/g, '');
    let dest_id = document
      .getElementById('LinksImportDestinationID')
      .value.replace(/\"/g, '');
    let volume_id = document
      .getElementById('LinksImportVolume')
      .value.replace(/\"/g, '');

    this.model.set_links_varnames(origin_id, dest_id, volume_id);
    this.model.set_links_aggr(
      document.getElementById('LinksImportOrigineID').value
    );

    this.model
      .import_links(linksfile, this.view.import_end.bind(this.view))
      .catch(this.view.error_links_file());
  }

  import_zip(e, zipfile = null) {
    //If we called this function without parameter (for the thumbail), we get the file
    //from the zip input
    if (zipfile === null)
      zipfile = document.getElementById('ImportZip').files[0];
    this.model
      .import_zip(zipfile, this.post_import_zip.bind(this))
      .catch(this.view.error_zip_file());
  }
  post_import_zip(res, config) {
    //Updating styles
    let nstyle = config.styles.nodes;

    let lstyle = config.styles.links;

    if (!lstyle.stroke) {
      lstyle.stroke = { color: 'grey', size: '0' };
    }
    if (!nstyle.stroke) {
      nstyle.stroke = { color: 'grey', size: '0' };
    }
    config.lock = 'true';

    this.model.update_nodes_style(nstyle);
    this.model.update_links_style(lstyle);
    //Add filters
    this.render_filters(this.render_all.bind(this));

    //Render layer cards
    this.render_layers_cards();
    //Render layers in the map with center and zoom config
    this.view.renderer.render_layers(
      this.model.config.layers,
      this.model.config.styles,
      this.model.config.center,
      this.model.config.zoom
    );

    //Computing the link data range before initializing the filters
    let link_values = this.model.data.crossfilters
      .all()
      .map((el) => parseFloat(el[this.model.config.varnames.vol]));

    let link_data_range = [d3.min(link_values), d3.max(link_values)];
    console.log(link_data_range);

    this.view.import_end(
      res,
      this.model.get_nodes(),
      this.model.get_links(true, true),
      config,
      link_data_range
    );
    document.getElementById(
      'projection-' + this.model.get_projection()
    ).selected = true;
    this.view.set_projection(
      this.model.get_projection(),
      this.model.get_nodes(),
      this.model.get_links(true, true),
      config,
      link_data_range
    );
  }

  load_thumbnail_zip() {
    const that = this;
    var blob;
    var request = new XMLHttpRequest();
    request.open('GET', './public/data/netcity.zip');
    request.responseType = 'blob';
    request.onload = function () {
      blob = request.response;
      var file = new File([blob], 'netcity.zip');

      that.import_zip(null, file);
    };
    request.send();
  }

  render_all() {
    let proj_sel = document.getElementById('projection');
    let proj = proj_sel.options[proj_sel.selectedIndex].value;
    //Garder la map à la même position
    let view = this.view.renderer.map.getView();
    let center = view.getCenter(this.model.config.center);
    let zoom = view.getZoom(this.model.config.zoom);

    // Conserver la visibilité des layers
    let layers_visibility = {};
    this.view.renderer.map.getLayers().forEach((layer) => {
      layers_visibility[layer.get('name')] = layer.getVisible();
    });

    this.view.renderer.render(
      this.model.get_nodes(),
      this.model.get_links(true, false),
      this.model.get_nodes_style(),
      this.model.get_links_style()
    );

    // Restaurer la visibilité des layers
    this.view.renderer.map.getLayers().forEach((layer) => {
      if (layers_visibility[layer.get('name')] !== undefined) {
        layer.setVisible(layers_visibility[layer.get('name')]);
      }
    });
    /* 
        view.setCenter(center);
        view.setZoom(zoom);
         */
    //view.setProjection(projection);
  }

  // PROJECTION //

  set_projection() {
    let proj_sel = document.getElementById('projection');
    let proj = proj_sel.options[proj_sel.selectedIndex].value;

    this.model.set_projection(proj);
    let config = this.model.config;
    this.view.set_projection(
      proj,
      this.model.get_nodes(),
      this.model.get_links(true),
      config
    );
  }
  load_projections() {
    let projs = Object.keys(global.projections);
    document.getElementById('projection').innerHTML = projs
      .map(
        (p) =>
          "<option id='projection-" +
          p +
          "' value='" +
          p +
          "''>" +
          global.projections[p].name +
          '</option>'
      )
      .join('');
  }

  // SEMIOLOGY //

  show_nodes_semio() {
    let nstyle = this.model.get_nodes_style();
    //We need them in the modal to be able to chose according to which property the color will vary
    //We take the first line to be able to identify data types for each property
    let nodes_properties = this.model.data.nodes[0].properties;

    //To open the semio modal
    this.view.update_nodes_semio(
      nstyle,
      nodes_properties,
      //This is the callback function when the modal is closed
      this.save_nodes_semio.bind(this)
    );
  }
  save_nodes_semio(new_semio) {
    let nodes_z_index = this.model.config.layers.filter(
      (l) => l.name === 'nodes'
    )[0].z_index;
    let links_z_index = this.model.config.layers.filter(
      (l) => l.name === 'links'
    )[0].z_index;

    //Update the model config
    this.model.update_nodes_style(new_semio);

    //Re-render the nodes with new style
    this.view.renderer.update_nodes(
      this.model.get_nodes(),
      this.model.get_nodes_style(),
      nodes_z_index
    );
    let lstyle = this.model.get_links_style();

    //Re-render the links because the depend on nodes size
    this.view.renderer.update_links(
      this.model.get_links(true),
      lstyle,
      links_z_index
    );

    this.render_legend();
  }
  show_links_semio() {
    let lstyle = this.model.get_links_style();
    //We need them in the modal to be able to chose according to which property the color will vary
    //We take the first line to be able to identify data types for each property
    console.log(this.model.data);
    let links_properties = this.model.data.links[0];

    //To open the semio modal
    this.view.update_links_semio(
      lstyle,
      links_properties,
      //This is the callback function when the modal is closed
      this.save_links_semio.bind(this)
    );
  }
  save_links_semio(new_semio) {
    let links_z_index = this.model.config.layers.filter(
      (l) => l.name === 'links'
    )[0].z_index;

    //Update the model config
    this.model.update_links_style(new_semio);

    this.view.renderer.update_links(
      this.model.get_links(true),
      this.model.get_links_style(),
      links_z_index
    );
    this.render_legend();
  }
  show_links_shape() {
    let lstyle = this.model.get_links_style();
    this.view.update_links_shape(lstyle, this.save_links_shape.bind(this));
  }
  save_links_shape(new_semio) {
    this.model.update_links_style(new_semio);
    let links = this.model.get_links(true);
    // this.view.renderer.update_links(links, new_semio);
    this.render_all();
    $('#changeGeometryModal').modal('hide');
  }
  show_geojson_semio(e) {
    let layer_name;
    if (e.target.tagName === 'IMG')
      layer_name = e.target.parentNode.id.split('buttonChangeGeojsonSemio')[1];
    else if (e.target.tagName === 'BUTTON')
      layer_name = e.target.id.split('buttonChangeGeojsonSemio')[1];
    let layer_style = this.model.config.styles.geojson[layer_name];

    this.view.update_geojson_semio(
      layer_name,
      layer_style,
      this.save_geojson_semio.bind(this)
    );
  }

  save_geojson_semio(layer_name, new_semio) {
    //updateing the model style
    this.model.config.styles.geojson[layer_name] = new_semio;
    this.view.renderer.update_layer_style(layer_name, new_semio);
  }

  // LEGEND //

  render_legend() {
    let nstyle = this.model.get_nodes_style();
    let lstyle = this.model.get_links_style();

    let nodes = this.model.get_nodes();
    let links = this.model.data.filtered_links;

    //Update nodes radius in pixel (according to zoom level)
    this.view.renderer.update_circles_radius();
    let nodes_hash = this.view.renderer.proj_nodes_hash;

    //Same for links
    this.view.renderer.update_links_height(links, lstyle);
    let links_hash = this.view.renderer.proj_links_hash;

    this.view.render_legend(
      nodes,
      nodes_hash,
      nstyle,
      links,
      links_hash,
      lstyle,
      this.toggle_legend
    );
  }

  toggle_legend() {
    let legendDiv = document.getElementById('legend');
    let style = getComputedStyle(legendDiv);
    let legendButtonDiv = document.getElementById('legendButton');
    if (style.display !== 'none') {
      legendDiv.style.display = 'none';
      legendButtonDiv.style.display = 'flex';
    } else {
      legendDiv.style.display = 'flex';
      legendButtonDiv.style.display = 'none';
    }
  }

  // FILTERS //
  toggle_new_filter_modal() {
    //We take the first node/link to be able to display properties,
    //as well as filter their types (numeral or string) in the filter modal
    let nodes_properties = this.model.data.nodes[0].properties;
    let links_properties = this.model.data.links[0];

    this.view.new_filter(
      nodes_properties,
      links_properties,
      this.add_filter.bind(this)
    );
  }

  render_filters(render_all) {
    document.getElementById('Filters').innerHTML = '';

    let filters = this.model.config.filters;
    let barchartFilters = []; // Pour stocker les références aux filtres barchart

    // Créer d'abord tous les filtres
    for (let i = 0; i < filters.length; i++) {
      let variable = filters[i].id;
      let type = filters[i].type;
      let target = filters[i].target;

      let filter_div, filter_instance;

      // Traiter différemment selon le type de filtre
      if (type === 'numeral' || type === 'continuous') {
        // Filtres numériques avec barchart
        [filter_div, filter_instance] = this.barchart_filter(
          target,
          variable,
          type,
          render_all
        );
        document.getElementById('Filters').append(filter_div);

        // Stocker la référence au filtre pour initialisation ultérieure
        if (filter_instance && filters[i].range) {
          barchartFilters.push({
            instance: filter_instance,
            range: filters[i].range,
          });
        }
      } else if (
        type === 'categorial' ||
        type === 'remove' ||
        type === 'discrete' ||
        type === 'temporal'
      ) {
        // Filtres catégoriels avec sélection multiple
        filter_div = document.createElement('div');
        const filter_id = 'filter-' + target + '-' + variable + '-' + type;
        filter_div.id = filter_id;
        filter_div.className =
          type === 'categorial'
            ? 'categorialFilter'
            : type === 'discrete'
            ? 'discreteFilter'
            : type === 'temporal'
            ? 'temporalFilter'
            : 'categorialFilter';

        document.getElementById('Filters').append(filter_div);

        // Mode d'opération pour le filtre catégoriel
        const mode = type === 'remove' ? 'remove' : 'add';

        // Initialiser le filtre catégoriel
        this.categorial_filter(target, variable, filter_id, mode);
      } else {
        // Autres types de filtres (traités comme des barcharts)
        [filter_div, filter_instance] = this.barchart_filter(
          target,
          variable,
          type,
          render_all
        );
        document.getElementById('Filters').append(filter_div);

        // Stocker la référence au filtre pour initialisation ultérieure
        if (filter_instance && filters[i].range) {
          barchartFilters.push({
            instance: filter_instance,
            range: filters[i].range,
          });
        }
      }
    }

    // Initialiser les brushes séquentiellement avec des délais croissants
    // Uniquement pour les filtres de type barchart
    barchartFilters.forEach((filter, index) => {
      setTimeout(() => {
        try {
          if (filter.instance && filter.range) {
            console.log(
              `Initializing brush for ${filter.instance.filter_id} with range:`,
              filter.range
            );
            filter.instance.update_brush_extent(filter.range);
          }
        } catch (error) {
          console.error(`Error initializing brush for filter ${index}:`, error);
        }
      }, 1500 + index * 500); // Délai croissant pour chaque filtre
    });
  }
  add_filter(target, variable, type) {
    this.model.config.filters.target = document.getElementById(
      'filteredLayer'
    ).value;
    const filter_id =
      'filter-' +
      this.model.config.filters.target +
      '-' +
      variable +
      '-' +
      type;
    const filter_container = document.getElementById(filter_id);
    //Checking is the filter already exists
    if (filter_container !== null) {
      document.getElementById('filterTypeSelect').classList.add('is-invalid');
      return;
    } else {
      document
        .getElementById('filterTypeSelect')
        .classList.remove('is-invalid');
      $('#FilterModal').modal('hide');
    }

    let filter_div;
    let filter;
    if (type === 'numeral') {
      filter_div = this.barchart_filter(
        target,
        variable,
        type,
        this.render_all.bind(this)
      )[0];
      document.getElementById('Filters').append(filter_div);

      let dimension = this.model.data.filters[
        `filter-${target}-${variable}-${type}`
      ];
      //Saving the range
      let values = dimension
        .group()
        .all()
        .map((e) => parseFloat(e.key));

      let min = d3.min(values);
      let max = d3.max(values);

      let range = [min, max];

      filter = {
        target: target,
        id: variable,
        type: type,
        filter_id: 'filter-' + target + '-' + variable + '-' + type,
        range: range,
      };
    } else if (type === 'continuous') {
      filter_div = this.barchart_filter(
        target,
        variable,
        type,
        this.render_all.bind(this)
      )[0];
      document.getElementById('Filters').append(filter_div);

      let dimension = this.model.data.filters[
        `filter-${target}-${variable}-${type}`
      ];
      //Saving the range
      let values = dimension
        .group()
        .all()
        .map((e) => parseFloat(e.key));

      let min = d3.min(values);
      let max = d3.max(values);

      let range = [min, max];

      filter = {
        target: target,
        id: variable,
        type: type,
        filter_id: 'filter-' + target + '-' + variable + '-' + type,
        range: range,
      };
    } else if (type === 'discrete') {
      filter_div = document.createElement('div');
      const filter_id = 'filter-' + target + '-' + variable + '-' + type;
      filter_div.id = filter_id;
      filter_div.className = 'discreteFilter';
      document.getElementById('Filters').append(filter_div);
      //Fill the div with filter
      this.categorial_filter(target, variable, filter_id, 'add');

      filter = {
        target: target,
        id: variable,
        type: type,
        filter_id: 'filter-' + target + '-' + variable + '-' + type,
      };
    } else if (type === 'categorial') {
      filter_div = document.createElement('div');
      const filter_id = 'filter-' + target + '-' + variable + '-' + type;
      filter_div.id = filter_id;
      filter_div.className = 'categorialFilter';
      document.getElementById('Filters').append(filter_div);
      //Fill the div with filter
      this.categorial_filter(target, variable, filter_id, 'add');
      console.log(target);
      filter = {
        target: target,
        id: variable,
        type: type,
        filter_id: 'filter-' + target + '-' + variable + '-' + type,
      };
    } else if (type === 'temporal') {
      filter_div = document.createElement('div');
      const filter_id = 'filter-' + target + '-' + variable + '-' + type;
      filter_div.id = filter_id;
      filter_div.className = 'temporalFilter';
      document.getElementById('Filters').append(filter_div);
      //Fill the div with filter
      this.categorial_filter(target, variable, filter_id, 'add');

      filter = {
        target: target,
        id: variable,
        type: type,
        filter_id: 'filter-' + target + '-' + variable + '-' + type,
      };
    } else if (type === 'remove') {
      filter_div = document.createElement('div');
      const filter_id = 'filter-' + target + '-' + variable + '-' + type;
      filter_div.id = filter_id;
      filter_div.className = 'categorialFilter';
      document.getElementById('Filters').append(filter_div);
      //Fill the div with filter
      this.categorial_filter(target, variable, filter_id, 'remove');
      filter = {
        target: target,
        id: variable,
        type: type,
        filter_id: 'filter-' + target + '-' + variable + '-' + type,
      };
    } else {
      filter_div = '< div > Lol < /div>';
      document.getElementById('Filters').append(filter_div);
    }

    this.model.config.filters.push(filter);
  }
  delete_filter(event) {
    let filter_id = event.target.parentNode.id;

    //removing filter from model.config

    let new_filters = this.model.config.filters.filter((filter) => {
      let full_id =
        'filter-' + filter.target + '-' + filter.id + '-' + filter.type;

      return full_id !== filter_id;
    });
    this.model.config.filters = new_filters;

    //Removing dimension from the crossfilter
    console.log(this.model.data.filters);
    this.model.data.filters[filter_id].dispose();

    //Removing the dimension from model.data
    delete this.model.data.filters[filter_id];

    //Remove chart from this.charts
    this.charts = this.charts.filter((c) => c.filter_id !== filter_id);

    let filter_div = document.getElementById(filter_id);
    document.getElementById('Filters').removeChild(filter_div);

    //Update other charts's bar with only filtered values
    // this.update_bars();

    this.render_all();
  }

  barchart_filter(target, id, type, render_all) {
    const filter_id = `filter-${target}-${id}-${type}`;
    let dimension = this.create_dimension(id, filter_id);
    let filtered_range = null;

    // Vérifier si le filtre existe dans la configuration importée
    const existingFilter = this.model.config.filters.find(
      (f) => f.filter_id === filter_id
    );

    if (existingFilter && existingFilter.range) {
      // Utiliser la plage de valeurs du filtre importé
      filtered_range = existingFilter.range;

      // Appliquer le filtre à la dimension
      dimension.filterAll();
      dimension.filterRange(filtered_range);

      console.log(
        `Initializing filter ${filter_id} with range:`,
        filtered_range
      );
    }

    let group = dimension.group();

    // Créer l'instance du filtre
    let f = new BarChartFilter(
      id,
      filter_id,
      dimension,
      group,
      render_all,
      this.delete_filter.bind(this),
      this.render_legend.bind(this),
      this.model.config.styles.links,
      this.model.config.styles.nodes,
      this.update_bars.bind(this),
      filtered_range,
      target === 'nodes' ? this.model.data.nodes : this.model.data.links,
      type,
      target
    );

    let filter_div = f.render();

    // Si nous avons une plage de valeurs, mettre à jour l'étendue du brush
    if (filtered_range) {
      // Attendre que le DOM soit prêt
      setTimeout(() => {
        f.update_brush_extent(filtered_range);
      }, 0);
    }

    this.charts.push(f);

    return [filter_div, f];
  }

  update_bars() {
    //For every barchart remaining, we update their bars to display only filtered values
    for (let chart of this.charts) {
      let filtered_data;
      if (this.model.data.crossfilters.allFiltered() === [])
        filtered_data = this.model.data.crossfilters.all();
      else filtered_data = this.model.data.crossfilters.allFiltered();

      let tempCrossfilter = crossfilter(filtered_data);

      let tempDimension = tempCrossfilter.dimension(function (d) {
        return d[chart.variable];
      });

      let filteredGroup = tempDimension.group().top(Infinity);

      //Update the y domain
      chart.y.domain([0, filteredGroup[0].value]);

      let div = document.getElementById(chart.filter_id);

      let g = d3.select(div).select('g');
      g.selectAll('.bar').attr('d', chart.barPathF(chart, filteredGroup));
    }
  }
  categorial_filter(target, variable, filter_id, mode) {
    console.log('Target:', target);
    console.log('Variable:', variable);
    console.log('Filter ID:', filter_id);
    console.log('Mode:', mode);

    let dimension = this.create_dimension(variable, filter_id);
    let filtering_properties;
    console.log(this.model.data);
    if (target === 'links') {
      filtering_properties = this.model.data.links.map((link) => {
        return link[variable];
      });
    } else if (target === 'nodes') {
      filtering_properties = this.model.data.nodes.map((node) => {
        return node.properties[variable];
      });
    }

    console.log(`Filtering Properties for ${target}:`, filtering_properties);

    ReactDOM.render(
      <CategorialFilter
        variable={variable}
        target={target}
        filtering_properties={filtering_properties}
        dimension={dimension}
        render_all={this.render_all.bind(this)}
        delete_filter={this.delete_filter.bind(this)}
        mode={mode}
      />,
      document.getElementById(filter_id)
    );
  }

  create_dimension(vname, filter_id) {
    console.log(vname, filter_id);
    let dim = this.model.data.crossfilters.dimension((l) => l[vname]);

    // let range = [
    //   +dim.group().all()[0].key,
    //   +dim.group().all()[dim.group().all().length - 1].key,
    // ];

    // dim.filterRange(range);

    this.model.data.filters[filter_id] = dim;
    console.log(this.model.data.filters);
    // this.config.filters.push({
    //   id: vname,
    //   range: [
    //     +dim.group().all()[0].key,
    //     +dim.group().all()[dim.group().all().length - 1].key,
    //   ],
    // });

    return dim;
  }

  // LAYERS //

  addLayer(e) {
    if (e.target.id === 'tileLayerButton')
      ReactDOM.render(
        <NewTileLayerModal
          save_layer={this.saveLayer.bind(this)}
          layers={this.model.config.layers}
        />,
        document.getElementById('ModalNewLayer')
      );
    else if (e.target.id === 'importLayerbutton')
      ReactDOM.render(
        <NewGeojsonLayerModal
          save_layer={this.saveLayer.bind(this)}
          layers={this.model.config.layers}
        />,
        document.getElementById('ModalNewGeojson')
      );
    else if (e.target.id === 'baseLayerButton') {
      ReactDOM.render(
        <NewReferenceLayerModal
          save_layer={this.saveLayer.bind(this)}
          layers={this.model.config.layers}
        />,
        document.getElementById('ModalNewReference')
      );
      document
        .getElementById('geojsonReferenceModal')
        .setAttribute('style', 'display:block');
    }
  }
  saveLayer(type, name, config = null) {
    //We'll add it in the background
    const z_index = -this.model.config.layers.length;

    const layer_object = {
      name: name,
      type: type,
      z_index: z_index,
    };
    console.log(layer_object);
    this.model.config.layers.push(layer_object);

    //Add the style to the model config (tiles don't have styles)
    if (type !== 'tile') {
      this.model.config.styles[type][name] = config;
    }

    //Display the layers in the map
    if (type === 'tile') {
      this.view.renderer.add_tile_layer(layer_object);
    } else if (type === 'geojson') {
      this.view.renderer.add_geojson_layer(layer_object, config);
    }

    //Display layer cards
    this.render_layers_cards();
  }
  delete_layer(layer_name, type) {
    //Delete layers from model config
    this.model.config.layers = this.model.config.layers.filter(
      (layer) => layer.name !== layer_name
    );

    //  console.log(layer_name)
    //  console.log(this.view.renderer.map.getLayers().getArray())
    // console.log(layer.get(layer_name))
    //delete style (if it's a geojson or baselayer)
    if (type === 'geojson') delete this.model.config.styles.geojson[layer_name];

    if (type === 'baselayer')
      delete this.model.config.styles.baselayer[layer_name];

    // console.log(this.model.config.styles.baselayer)

    //Delete layers from map
    this.view.renderer.map
      .getLayers()
      .getArray()
      .filter((layer) => layer.get('name') === layer_name)
      .forEach((layer) => this.view.renderer.map.removeLayer(layer));

    //Update z_indexes in model
    this.update_model_z_indexes();

    //Update z-indexes in map
    this.view.renderer.update_map_z_indexes(this.model.config.layers);

    //Re-render the cards
    this.render_layers_cards();
  }
  change_layer_visibility(event) {
    //Compute layerName according to the target of the click (the img or the button)
    let layerName;
    if (event.target.tagName === 'IMG')
      layerName = event.target.parentNode.id.split('buttonHideLayer')[1];
    else if (event.target.tagName === 'BUTTON')
      layerName = event.target.id.split('buttonHideLayer')[1];

    //change visibility
    for (let layer of this.view.renderer.map.getLayers().array_) {
      if (layer.values_.name === layerName) {
        layer.setVisible(!layer.getVisible());
        //Changing the icon
        let eyeIcon = document.getElementById(layerName + 'Visibility');

        if (layer.getVisible() === true)
          eyeIcon.src = './assets/svg/si-glyph-view.svg';
        else if (layer.getVisible() === false)
          eyeIcon.src = './assets/svg/si-glyph-noview.svg';
      }
    }
  }

  render_layers_cards() {
    //Display the layers cards
    ReactDOM.render(
      <LayerCardsContainer
        layers={this.model.config.layers}
        map={this.view.renderer.map}
        delete_layer={this.delete_layer.bind(this)}
        change_layer_visibility={this.change_layer_visibility.bind(this)}
        show_nodes_semio={this.show_nodes_semio.bind(this)}
        show_links_semio={this.show_links_semio.bind(this)}
        show_links_shape={this.show_links_shape.bind(this)}
        show_geojson_semio={this.show_geojson_semio.bind(this)}
      />,
      document.getElementById('accordionLayerControl')
    );
  }

  update_model_z_indexes() {
    this.model.config.layers = this.model.config.layers.map((l, i) => {
      if (i === 0) l.z_index = 0;
      else l.z_index = -i;
      return l;
    });
  }

  update_stats() {
    console.log(this.model.get_nodes(), this.model.get_links(true));
  }

  handleExternalData(data) {
    // Vérifier que les données sont valides
    if (!data.nodes || !data.links) {
      console.error('Invalid data format: nodes and links are required.');
      return;
    }

    // Importer les données dans le modèle
    this.model.importExternalData(data);

    this.model.data.nodes.forEach((node) => {
      if (
        node[this.model.config.varnames.lat] !== undefined &&
        node[this.model.config.varnames.long] !== undefined
      ) {
        node.geometry = {
          type: 'Point',
          coordinates: [
            node[this.model.config.varnames.lat],
            node[this.model.config.varnames.long],
          ], // Assurez-vous que les coordonnées sont dans le bon ordre
        };
      } else {
        console.error('Invalid node coordinates:', node);
      }
    });
    // Calculer le range des données de lien
    const link_values = this.model.data.links.map((link) =>
      parseFloat(link[this.model.config.varnames.vol])
    );
    const link_data_range = [d3.min(link_values), d3.max(link_values)];

    let lstyle = this.model.config.styles.links;

    if (!lstyle.stroke) {
      lstyle.stroke = { color: 'grey', size: '1' };
    }
    // Cacher le loader après l'importation des données
    document.getElementById('spinnerDiv').style.display = 'none';

    // Appeler la méthode import_end avec les données appropriées
    this.view.import_end(
      this.model.data.res,
      this.model.get_nodes(),
      this.model.get_links(true, true),
      this.model.config,
      link_data_range
    );

    console.log('Données importées:', this.model.data);
  }

  saveDataToIndexedDB(data) {
    let request = indexedDB.open('ArabesqueDB', 1);

    request.onupgradeneeded = function (event) {
      let db = event.target.result;
      if (!db.objectStoreNames.contains('dataStore')) {
        db.createObjectStore('dataStore', { keyPath: 'id' });
      }
    };

    request.onsuccess = function (event) {
      let db = event.target.result;
      let transaction = db.transaction(['dataStore'], 'readwrite');
      let objectStore = transaction.objectStore('dataStore');
      objectStore.put({ id: 'arabesqueData', data: data });
    };

    request.onerror = function (event) {
      console.error("Erreur lors de l'accès à l'indexDB:", event);
    };
  }
}
