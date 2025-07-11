import { Map, View, Feature } from 'ol';
import { ScaleLine, defaults as defaultControls, Control } from 'ol/control';
import FullScreen from 'ol/control/FullScreen';
import TileLayer from 'ol/layer/Tile';
import { Polygon, Circle, Point } from 'ol/geom.js';
import { Fill, Stroke, Text, Style, RegularShape } from 'ol/style.js';
import CircleStyle from 'ol/style/Circle';
import Overlay from 'ol/Overlay';
import CanvasTitle from 'ol-ext/control/CanvasTitle';
import { TileImage, TileWMS } from 'ol/source';
import { Tile, Vector as VectorLayer } from 'ol/layer.js';
import { OSM, Vector as VectorSource, XYZ } from 'ol/source.js';
import LayerGroup from 'ol/layer/Group';
import GeoJSON from 'ol/format/GeoJSON';
import Legend from 'ol-ext/control/Legend';
import { transform } from 'ol/proj';
import * as d3 from 'd3';
import { boundingExtent } from 'ol/extent';
import proj4 from 'proj4';
import { register } from 'ol/proj/proj4';
import { get as getProjection } from 'ol/proj';
import smooth from 'chaikin-smooth';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { easeBack } from 'd3';
import canvg from 'canvg';

export default class OlRenderer {
  constructor(divid) {
    let projs = Object.keys(global.projections);
    projs.forEach((p) => proj4.defs(p, global.projections[p].proj4));
    register(proj4);

    this.customizeMapSource();
    this.customizeMapAuthor();

    this.map = new Map({
      controls: defaultControls().extend([
        this.exportButton(),
        new FullScreen(),
        this.toggleLegendButton(),
        this.scaleLine(),
        this.customizeMapTitle(),
        this.exportPdfButton(),
      ]),

      target: 'Mapcontainer',
      layers: [],
      renderer: 'webgl',
      view: new View({
        center: [0, 0],
        zoom: 10,
        projection: getProjection('Mercator / EPSG:3857'),
        minZoom: 0,
        multiWorld: false,
        maxZoom: 18,
        constrainOnlyCenter: true,
      }),
    });

    this._popup = new Overlay({
      element: document.getElementById('popup'),
      positioning: 'bottom-center',
      stopEvent: true,
    });

    this.map.addOverlay(this._popup);

    // this._extent_size = 10000000;
    this._node_scale_types = { size: 'Sqrt', opacity: 'Linear' };
    this._scales = {
      Sqrt: d3.scaleSqrt(),
      Pow: d3.scalePow(),
      Log: d3.scaleLog(),
      Linear: d3.scaleLinear(),
    };

    this._node_var = {
      color: 'degree',
      size: 'degree',
      text: 'degree',
      opacity: 'degree',
    };
    this._node_size_ratio = 100;

    this._scale_node_color = d3.scaleLinear();
    this._scale_node_size = d3.scaleLinear();
    this._scale_node_opacity = d3.scaleLinear();
    this._node_color_groups = {};

    this._link_var = {
      color: 'degree',
      size: 'degree',
      opacity: 'degree',
    };
    this._link_scale_types = { size: 'Sqrt', opacity: 'Linear' };
    this._scale_link_size = d3.scaleSqrt();
    this._link_size_ratio = 100;
    this._scale_link_color = d3.scaleLinear();
    this._scale_link_size = d3.scaleLinear();
    this._scale_link_opacity = d3.scaleLinear();
    this._link_color_groups = {};
    //Initializing a hash link object to store radius in px
    this.proj_links_hash = {};
  }

  //CONTROLS //

  scaleLine() {
    let control = new ScaleLine({
      units: 'metric',
      bar: true,
      minWidth: 140,
      target: document.getElementById('scaleLine'),
    });
    return control;
  }
  customizeMapTitle() {
    // CanvasTitle control
    var titleControl = new CanvasTitle({
      // CanvasTitle control
      style: new Style({
        text: new Text({
          offsetY: 20,
          top: 'unset',
          bottom: '0',
          width: 50,
          right: 0,
          visibility: 'hidden',
          text: '',
          font: '30px Arial', // Taille de police 50px
        }),
      }),
    });
    document.getElementById('titleMap').addEventListener('input', function () {
      //
      global.title = this.value;
      titleControl.setTitle(this.value);
    });

    return titleControl;
  }

  customizeMapAuthor() {
    let authorTextSpan;
    // Écouteur d'événements pour l'élément avec l'ID 'authorMap'
    document.getElementById('authorMap').addEventListener('input', function () {
      var author = this.value;

      // Sélectionner le 'span' dans 'sourceDiv'
      var authorTextSpan = document.getElementById('authorText');

      if (authorTextSpan) {
        // Ajouter le texte de 'authorMap' au 'span'
        authorTextSpan.textContent = author;
      }
    });
    return authorTextSpan;
  }

  customizeMapSource() {
    let sourceTextSpan;
    // Écouteur d'événements pour l'élément avec l'ID 'sourceMap'
    document.getElementById('sourceMap').addEventListener('input', function () {
      var source = this.value;

      // Sélectionner le 'span' dans 'sourceDiv'
      var sourceTextSpan = document.getElementById('sourceText');

      if (sourceTextSpan) {
        // Ajouter le texte de 'sourceMap' au 'span'
        sourceTextSpan.textContent = source;
      }
    });

    return sourceTextSpan;
  }

  exportButton() {
    //Create export button
    var exportButtonDiv = document.createElement('div');
    exportButtonDiv.id = 'ExportMap';
    exportButtonDiv.className = 'custom-control';
    var exportButtonControl = new Control({ element: exportButtonDiv });

    return exportButtonControl;
  }
  toggleLegendButton() {
    //Toggle legend button
    var legendDiv = document.createElement('div');
    legendDiv.id = 'legendButton';
    legendDiv.className = 'custom-control';
    var legendButtonControl = new Control({ element: legendDiv });

    return legendButtonControl;
  }

  exportPdfButton() {
    //Create export button
    var exportButtonDiv = document.createElement('div');
    exportButtonDiv.id = 'ExportMapPdf';
    exportButtonDiv.className = 'custom-control';
    exportButtonDiv.onclick = this.exportPdf.bind(this);
    var exportButtonControl = new Control({ element: exportButtonDiv });

    const downloadDiv = document.createElement('a');
    downloadDiv.id = 'image-download';
    downloadDiv.crossOrigin = 'Anonymous';
    exportButtonDiv.appendChild(downloadDiv);

    return exportButtonControl;
  }
  exportPdf(e) {
    let map = this.map;

    var doc = new jsPDF('p', 'px');
    var doc_width = doc.internal.pageSize.getWidth();
    var doc_height = doc.internal.pageSize.getHeight();

    //Excluding the close button from rendering
    document
      .getElementById('legendClose')
      .setAttribute('data-html2canvas-ignore', '');

    //Adding a width and height to svg elements so they will be rendered

    var svgElements = document.body.querySelectorAll('#legendShapes');
    var svgElements2 = document.body.querySelectorAll('#sourceDiv');
    svgElements.forEach(function (item) {
      item.setAttribute('width', item.getBoundingClientRect().width);
      item.setAttribute('height', item.getBoundingClientRect().height);
    });

    svgElements2.forEach(function (item) {
      item.setAttribute('width', item.getBoundingClientRect().width);
      item.setAttribute('height', item.getBoundingClientRect().height);
    });

    var map_canvas = $('.ol-viewport canvas')[0];

    var map_img = map_canvas.toDataURL('image/png');
    const map_div = document.getElementById('Mapcontainer');
    const map_height = parseFloat(
      window.getComputedStyle(map_div).height.split('.')[0]
    );
    const map_width = parseFloat(
      window.getComputedStyle(map_div).width.split('.')[0]
    );
    const map_ratio = map_height / map_width;

    let margin_left = 10;
    let margin_right = 10;

    //Adapting map size in case the map is to big to fit the document
    let map_final_width, map_final_height;
    if (map_width > doc_width - margin_left - margin_right) {
      map_final_width = doc_width - margin_left - margin_right;
      map_final_height = map_final_width * map_ratio;
      if (map_final_height > doc_height * 0.66) {
        map_final_height = doc_height * 0.66;
        map_final_width = map_final_height * (1 / map_ratio);
      }
    }

    //Add map to doc
    // TODO Here, we can work on the PDF export
    doc.addImage(map_img, 'PNG', 10, 10, map_final_width, map_final_height);

    var attrib = document.getElementById('sourceDiv');

    //Converting legend to canvas and add it to doc
    html2canvas(attrib, {
      scrollX: -window.scrollX,
      scrollY: -window.scrollY,
      allowTaint: true,
    }).then((attrib_canvas) => {
      let attrib_div = attrib_canvas.toDataURL('image/png');
      let width_attrib = doc_width + margin_right - 10 - attrib.clientWidth;

      doc.addImage(attrib_div, 'JPEG', width_attrib, map_final_height + 20);
      svgElements2.forEach(function (item) {
        item.removeAttribute('width');
        item.removeAttribute('height');
      });
    });

    var legendDiv = document.getElementById('legend');
    let legendButtonDiv = document.getElementById('legendButton');

    let style = getComputedStyle(legendDiv);
    if (style.display === 'none') {
      legendDiv.style.display = 'flex';
      legendButtonDiv.style.display = 'none';
    }

    setTimeout(() => {
      //Converting legend to canvas and add it to doc
      html2canvas(legend, {
        scrollX: -window.scrollX,
        scrollY: -window.scrollY,
        allowTaint: true,
      }).then((legend_canvas) => {
        let legend_img = legend_canvas.toDataURL('image/png');

        doc.addImage(legend_img, 'JPEG', 10, map_final_height + 20);
        doc.save('map.pdf');
        svgElements.forEach(function (item) {
          item.removeAttribute('width');
          item.removeAttribute('height');
        });
      });
    }, 400);
  }

  // ON ZOOM //

  update_circles_radius() {
    let resolution_m = this.map.getView().getResolution();

    for (let node of Object.entries(this.proj_nodes_hash)) {
      let radius_px = node[1].radius / resolution_m;
      node[1].radius_px = radius_px;
    }
  }

  update_links_height(links, lstyle) {
    let resolution_m = this.map.getView().getResolution();

    for (let link of links) {
      let height_m = this.linkSize(link, lstyle);

      let height_px = height_m / resolution_m;

      this.proj_links_hash[link.key] = {
        value: link.value,
        height_m: height_m,
        height_px: height_px,
      };
    }
  }

  // Style function
  getFeatureStyle(feature) {
    var st = [];
    // Shadow style
    st.push(
      new ol.style.Style({
        image: new ol.style.Shadow({
          radius: 15,
        }),
      })
    );
    var st1 = [];
    // Font style
    st.push(
      new ol.style.Style({
        image: new ol.style.FontSymbol({
          form: 'marker',
          glyph: 'fa-car',
          radius: 15,
          offsetY: -15,
          fontSize: 0.7,
          color: '#fff',
          fill: new ol.style.Fill({
            color: 'blue',
          }),
          stroke: new ol.style.Stroke({
            color: '#fff',
            width: 2,
          }),
        }),
        stroke: new ol.style.Stroke({
          width: 5,
          color: '#f00',
        }),
        fill: new ol.style.Fill({
          color: [255, 0, 0, 0.6],
        }),
      })
    );
    return st;
  }

  fresh() {
    this.map.updateSize();
    this.map.render();
  }

  // TOOLS FUNCTIONS //

  getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
  }
  rgb_to_hex(color) {
    let rgb = color
      .slice(4, color.length - 1)
      .replace(/\ /g, '')
      .split(',')
      .map((c) => {
        let col = parseInt(c).toString(16);
        if (col.length === 1) {
          col = '0' + col;
        }
        return col;
      });

    return '#' + rgb[0] + rgb[1] + rgb[2];
  }

  add_opacity_to_color(color, opacity) {
    if (color.startsWith('rgb')) {
      color = this.rgb_to_hex(color);
    }
    let hex_opacity;
    if (opacity == 0) {
      hex_opacity = '00';
    } else {
      hex_opacity = Math.floor(opacity * 255).toString(16);
      if (hex_opacity.length === 1) {
        hex_opacity = '0' + hex_opacity;
      }
    }

    return color + hex_opacity;
  }

  //NODES //

  nodeStyle(node, nstyle) {
    //OPACITY
    let opacity;
    if (nstyle.opacity.mode === 'fixed') {
      opacity = Math.round(nstyle.opacity.fixed * 100) / 100;
    } else if (nstyle.opacity.mode === 'varied') {
      opacity = Math.round(this.nodeOpacityScale(node) * 100) / 100;
      //As log(0) = -Infinity, we affect zero in this case
      if (opacity === -Infinity) {
        opacity = 0;
      }
    }

    //COLOR
    let label = node.id;
    let labelText = '';
    if (document.getElementById('semioSelectorTextChangenode')) {
      if (
        document.getElementById('semioSelectorTextChangenode').value != null
      ) {
        let selectedLabel = document.getElementById(
          'semioSelectorTextChangenode'
        ).value;
        labelText = String(node.properties[selectedLabel] || '');
      }
    }

    if (nstyle.color.mode === 'fixed') {
      let style = new Style({
        stroke: new Stroke({
          color: nstyle.stroke.color,
          width: nstyle.stroke.size,
        }),
        fill: new Fill({
          color: this.add_opacity_to_color(nstyle.color.fixed, opacity),
        }),
        text: new Text({
          text: labelText,
          font: 'bold 13px Calibri,sans-serif',
          fill: new Fill({ color: '#000' }),
          stroke: new Stroke({
            color: '#fff',
            width: 2,
          }),
        }),
      });

      return style;
    } else if (nstyle.color.mode === 'varied') {
      //If the type is quantitative, we affect to each node a color of the gradient (equal intervals discretization method)
      if (nstyle.color.varied.type === 'quantitative') {
        // Valeur entre 0 et 8 arrondi à l'entier inférieur
        let color_index = Math.floor(
          this._scale_node_color(+node.properties[this._node_var.color])
        );

        let color_array = nstyle.color.varied.colors;
        return new Style({
          stroke: new Stroke({
            color: nstyle.stroke.color,
            width: nstyle.stroke.size,
          }),
          fill: new Fill({
            color: this.add_opacity_to_color(color_array[color_index], opacity),
          }),
          text: new Text({
            text: labelText,

            font: 'bold 13px Calibri,sans-serif',
            fill: new Fill({ color: '#000' }),
            stroke: new Stroke({
              color: '#fff',
              width: 2,
            }),
          }),
        });
      }
      //If it's qualitative, we just affect a random color of the palette to each node
      else if (nstyle.color.varied.type === 'qualitative') {
        let color_array = nstyle.color.varied.colors;
        let node_group = node.properties[this._node_var.color];
        return new Style({
          stroke: new Stroke({
            color: nstyle.stroke.color,
            width: nstyle.stroke.size,
          }),
          fill: new Fill({
            color: this.add_opacity_to_color(
              color_array[this._node_color_groups[node_group]],
              opacity
            ),
          }),
          text: new Text({
            text: labelText,

            font: 'bold 13px Calibri,sans-serif',
            fill: new Fill({ color: '#000' }),
            stroke: new Stroke({
              color: '#fff',
              width: 2,
            }),
          }),
        });
      }
    }
  }
  nodeOpacity(node, nstyle) {
    if (nstyle.opacity.mode === 'fixed') {
      return nstyle.opacity.fixed;
    } else if (nstyle.opacity.mode === 'varied') {
      return this.nodeOpacityScale(node);
    }
  }
  nodeOpacityScale(node) {
    let node_value;
    //If it's a log scale, we compute log(x+1) to prevent errors (log(0) = -Infinity
    if (this._node_scale_types.opacity === 'Log')
      node_value = node.properties[this._node_var.opacity] + 1;
    else node_value = node.properties[this._node_var.opacity];

    return this._scale_node_opacity(node_value);
  }

  //Creates color groups according to qualitative variable
  create_node_color_groups(nodes, nstyle) {
    this._color_groups = {};
    let color_groups = {};
    let indexes = [];

    for (let node of nodes) {
      //The property according to which the groups are formed
      let prop = node.properties[this._node_var.color];
      if (indexes.length === 0) {
        color_groups[prop] = 0;
        indexes.push(0);
      } else {
        if (color_groups[prop] === undefined) {
          let last_index = indexes[indexes.length - 1];
          if (last_index === 7) {
            color_groups[prop] = 0;
            indexes.push(0);
          } else {
            color_groups[prop] = last_index + 1;
            indexes.push(last_index + 1);
          }
        }
      }
    }

    this._node_color_groups = color_groups;
  }

  nodeSize(node, nstyle) {
    if (nstyle.size.mode === 'fixed') {
      //Arbitrary multiplication
      return nstyle.size.fixed * (this._extent_size / 1000);
    } else if (nstyle.size.mode === 'varied') {
      var ns = this.nodeSizeScale.bind(this);

      return ns(node);
    }
  }

  //For one node, this returns the corresponding value in the _node_scale scale, according to its degree
  nodeSizeScale(node) {
    //If it's log scale, we compute log(x+1) to prevent errors (log(0) = -Infinity)
    if (this._node_scale_types.size === 'Log')
      return this._scale_node_size(+node.properties[this._node_var.size]);
    else return this._scale_node_size(+node.properties[this._node_var.size]);
  }

  //If the range of a variable intersects zero, we block the rendering and keep the modal open
  handle_log_scale_size_range(
    min_size,
    max_size,
    do_not_close = false,
    modal_id
  ) {
    let scaleDiv;
    if (modal_id === '#semioNodes')
      scaleDiv = document.getElementById('typeSizeChangenode');
    else if (modal_id === '#semioLinks')
      scaleDiv = document.getElementById('typeSizeChangeLink');

    if (min_size < 0 || max_size < 0) {
      scaleDiv.classList.add('is-invalid');
      scaleDiv.onchange = () => scaleDiv.classList.remove('is-invalid');
      return false;
    } else {
      scaleDiv.classList.remove('is-invalid');
      if (do_not_close === false) $(modal_id).modal('hide');
    }

    return [min_size, max_size];
  }
  handle_log_scale_opacity_range(min_opa, max_opa, modal_id) {
    let scaleDiv;
    if (modal_id === '#semioNodes')
      scaleDiv = document.getElementById('typeSizeChangenode');
    else if (modal_id === '#semioLinks')
      scaleDiv = document.getElementById('typeSizeChangeLink');

    if (min_opa < 0 || max_opa < 0) {
      scaleDiv.classList.add('is-invalid');
      scaleDiv.onchange = () => scaleDiv.classList.remove('is-invalid');

      return false;
    } else {
      scaleDiv.classList.remove('is-invalid');
      $(modal_id).modal('hide');
    }
    //Compute log(x+1) because log(0) = -Infinity
    return [min_opa + 1, max_opa + 1];
  }

  add_nodes(nodes, nstyle) {
    // console.log(nodes)

    //On enregistre le max et min pour la définition de l'échelle
    this.nodes_max_value = d3.max(
      nodes.map((n) => n.properties[this._node_var.size])
    );
    this.nodes_min_value = d3.min(
      nodes.map((n) => n.properties[this._node_var.size])
    );

    this.update_nodes_var(nstyle);
    this.update_node_scales_types(nstyle);

    var map = this.map;
    let oldLayer = this.get_layer('nodes');
    let wasVisible = oldLayer ? oldLayer.getVisible() : true;
    map.removeLayer(oldLayer);
    // projection
    let proj_nodes = nodes.map(function (n) {
      return {
        center: transform(
          [n.geometry.coordinates[1], n.geometry.coordinates[0]],
          'EPSG:4326',
          map.getView().getProjection()
        ),
        properties: n.properties,
        id: n.id,
      };
    });
    // calcul de l'extent des noeuds pour definition des échelles
    let xs = [
      d3.max(proj_nodes, (n) => n.center[0]),
      d3.min(proj_nodes, (n) => n.center[0]),
    ];
    let ys = [
      d3.max(proj_nodes, (n) => n.center[1]),
      d3.min(proj_nodes, (n) => n.center[1]),
    ];
    this._extent_size = Math.min(xs[0] - xs[1], ys[0] - ys[1]);

    this.update_nodes_scales(nodes, nstyle);
    var ns = this.nodeSizeScale.bind(this);

    // calcul des rayon et stockage des noeuds dans une hash
    proj_nodes = proj_nodes.map(function (n) {
      return {
        center: n.center,
        radius: this.nodeSize(n, nstyle),
        properties: n.properties,
        id: n.id,
      };
    }, this);
    this.proj_nodes = proj_nodes;
    this.proj_nodes_hash = {};
    proj_nodes.forEach((n) => (this.proj_nodes_hash[n.id] = n));

    //Qualitative color grouping
    if (nstyle.color.varied.type === 'qualitative') {
      this.create_node_color_groups(nodes, nstyle);
    }

    // création des ronds
    let nodes_vector = new VectorSource({
      features: proj_nodes.map((co, i) => {
        let feature = new Feature(new Circle(co.center, co.radius));
        //We set a style for every feature, because it can be conditional
        feature.setStyle(this.nodeStyle(co, nstyle));
        feature.setProperties({
          nodeData: nodes[i], // Ajoutez ici toutes les informations supplémentaires nécessaires
        });
        return feature;
      }),
    });

    const labelStyle = new Style({
      text: new Text({
        font: '13px Calibri,sans-serif',
        fill: new Fill({
          color: '#000',
        }),
        stroke: new Stroke({
          color: '#fff',
          width: 4,
        }),
      }),
    });

    const countryStyle = new Style({
      fill: new Fill({
        color: 'rgba(255, 255, 255, 0.6)',
      }),
      stroke: new Stroke({
        color: '#319FD3',
        width: 1,
      }),
    });
    const style = [countryStyle, labelStyle];

    // Création de la couche
    let nodesLayer = new VectorLayer({
      name: 'nodes',
      source: nodes_vector,
      renderMode: 'image',
      visible: wasVisible,
    });

    nodesLayer.setZIndex(0);

    this.map.addLayer(nodesLayer);
    this.map.getView().fit(boundingExtent(proj_nodes.map((co) => co.center)));

    // Ajouter un écouteur d'événement pour le survol
    this.map.on('pointermove', function (event) {
      this.getTargetElement().style.cursor = this.hasFeatureAtPixel(event.pixel)
        ? 'pointer'
        : '';
    });

    // Sauvegarder une référence à this avant la fonction de rappel
    const self = this;
    // Ajouter un gestionnaire d'événements de clic aux polygones
    this.map.on('click', function (evt) {
      self.add_popup_nodes(evt);
    });
  }
  add_popup_nodes(evt) {
    let popup = this._popup;
    /**
     * Elements that make up the popup.
     */
    const container2 = document.getElementById('popup');
    const content = document.getElementById('popup-content');
    const closer = document.getElementById('popup-closer');

    // Ajouter un événement de clic pour fermer le popup
    closer.addEventListener('click', function (event) {
      event.preventDefault(); // Empêcher le comportement par défaut du lien
      container2.style.display = 'none'; // Cacher le popup
    });

    // Déterminer le layer sur lequel le clic s'est produit
    this.map.forEachFeatureAtPixel(evt.pixel, function (feature, layer) {
      if (layer.get('name') === 'nodes') {
        if (feature) {
          // Sélection de l'élément select
          var selectElement = document.getElementById(
            'semioSelectorSizeChangenode'
          );
          var selectedValue = selectElement ? selectElement.value : 'indegree';

          // Construire le contenu du popup avec les informations de l'entité
          let popupContent =
            '<h4 class="popup-title" > ID : ' +
            feature.get('nodeData').id +
            '</h4>';
          popupContent += '<hr>';
          popupContent += '<table class="popup-table table table-striped">';
          let i = 0;
          for (var key in feature.get('nodeData').properties) {
            popupContent +=
              '<tr class="' +
              (i % 2 == 0 ? '' : 'table-secondary') +
              '"><td class="popup-key" style="padding: 0.35em;">' +
              key +
              '</td><td class="popup-value" style="padding: 0.35em;">' +
              feature.get('nodeData').properties[key] +
              '</td></tr>';
            i++;
          }
          popupContent += '</table>';

          // Mettre à jour le contenu du popup
          content.innerHTML = popupContent;

          // Définir la position du popup sur le clic de la souris

          popup.setPosition(evt.coordinate);

          // Afficher le popup
          container2.style.display = 'block';
        } else {
          // Si aucun entité n'a été cliqué, cacher le popup
          container2.style.display = 'none';
        }
      }
    });
  }
  update_nodes(nodes, nstyle, z_index) {
    //Update nodes_var with discretization variables
    this.update_nodes_var(nstyle);
    this.update_node_scales_types(nstyle);
    this.update_nodes_scales(nodes, nstyle);

    var map = this.map;
    map.removeLayer(this.get_layer('nodes'));
    let proj_nodes = nodes.map(function (n) {
      return {
        center: transform(
          [n.geometry.coordinates[1], n.geometry.coordinates[0]],
          'EPSG:4326',
          map.getView().getProjection()
        ),
        properties: n.properties,
        id: n.id,
      };
    });
    //Dealing with the size of the nodes

    proj_nodes = proj_nodes.map(function (n) {
      return {
        center: n.center,
        radius: this.nodeSize(n, nstyle),
        properties: n.properties,
        id: n.id,
      };
    }, this);

    //Useful for qualitative color grouping
    if (nstyle.color.varied.type === 'qualitative') {
      this.create_node_color_groups(nodes, nstyle);
    }

    this.proj_nodes = proj_nodes;
    this.proj_nodes_hash = {};
    proj_nodes.forEach((n) => (this.proj_nodes_hash[n.id] = n));
    let nodes_vector = new VectorSource({
      features: proj_nodes.map((co, i) => {
        let circle = new Circle(co.center, co.radius);

        let feature = new Feature(circle);
        feature.setProperties({
          nodeData: nodes[i], // Ajoutez ici toutes les informations supplémentaires nécessaires
        });
        feature.setStyle(this.nodeStyle(co, nstyle));
        return feature;
      }),
    });

    let nodesLayer = new VectorLayer({
      name: 'nodes',
      source: nodes_vector,
      renderMode: 'image',
    });
    this.map.addLayer(nodesLayer);
    nodesLayer.setZIndex(z_index);

    const self = this;
    // Ajouter un gestionnaire d'événements de clic aux polygones
    this.map.on('click', function (evt) {
      self.add_popup_nodes(evt);
    });
  }

  //Update the variables according to which the color, size, text and opacity will vary
  update_nodes_var(nstyle) {
    if (nstyle.color.mode === 'varied') {
      this._node_var.color = nstyle.color.varied.var;
    }
    if (nstyle.size.mode === 'varied') {
      this._node_var.size = nstyle.size.varied.var;
      this._node_size_ratio = nstyle.size.varied.maxval;
    }

    this._node_var.text = nstyle.text.fixed;

    if (nstyle.opacity.mode === 'varied') {
      this._node_var.opacity = nstyle.opacity.varied.var;
    }
  }
  //Update size and opacity scale types (Linear,Pow etc)
  update_node_scales_types(nstyle) {
    this._node_scale_types.size = nstyle.size.varied.scale;
    this._node_scale_types.opacity = nstyle.opacity.varied.scale;
  }
  //Updates scales for sizing elements according to node_var
  update_nodes_scales(nodes, nstyle) {
    //COLORS

    //Pour l'échelle des couleurs
    let max_col = d3.max(nodes, (n) =>
      parseFloat(n.properties[this._node_var.color])
    );
    let min_col = d3.min(nodes, (n) =>
      parseFloat(n.properties[this._node_var.color])
    );

    this._scale_node_color = d3
      .scaleLinear()
      //Nombre de couleurs (7.99 car ayant 8 couleurs, l'indice finale ne doit pas dépasser 7)
      .range([0, 7.99])
      .domain([min_col, max_col]);

    //SIZE

    // recherche du max pour l'échelle des tailles
    let max_size = d3.max(nodes, (n) =>
      parseFloat(n.properties[this._node_var.size])
    );
    let min_size = d3.min(nodes, (n) =>
      parseFloat(n.properties[this._node_var.size])
    );

    //OPACITY
    let max_opa = d3.max(nodes, (n) =>
      parseFloat(n.properties[this._node_var.opacity])
    );
    let min_opa = d3.min(nodes, (n) =>
      parseFloat(n.properties[this._node_var.opacity])
    );

    //If scale is logarithmic, the range musn't cross zero
    if (
      this._node_scale_types.size === 'Log' ||
      this._node_scale_types.opacity === 'Log'
    ) {
      if (
        this._node_scale_types.size === 'Log' ||
        this._node_scale_types.opacity !== 'Log'
      ) {
        [min_size, max_size] = this.handle_log_scale_size_range(
          min_size,
          max_size,
          false,
          '#semioNodes'
        );
      } else if (
        this._node_scale_types.size !== 'Log' ||
        this._node_scale_types.opacity === 'Log'
      ) {
        [min_opa, max_opa] = this.handle_log_scale_opacity_range(
          min_opa,
          max_opa,
          '#semioNodes'
        );
      } else if (
        this._node_scale_types.size === 'Log' ||
        this._node_scale_types.opacity === 'Log'
      ) {
        [min_size, max_size] = this.handle_log_scale_size_range(
          min_size,
          max_size,
          true,
          '#semioNodes'
        );
        if ([min_size, max_size] === false) {
          return;
        }
        [min_opa, max_opa] = this.handle_log_scale_opacity_range(
          min_opa,
          max_opa,
          '#semioNodes'
        );
      }
    } else {
      $('#semioNodes').modal('hide');
    }
    // definition de l'échelle pour la taille. Le choix est fait de garder un domaine
    //fixe pour éviter le changement de rayon lorsqu'un filtre barchart est activé
    let domain_size;
    if (this._node_scale_types.size === 'Log')
      domain_size = [1, this.nodes_max_value];
    else domain_size = [this.nodes_min_value, this.nodes_max_value];

    this._scale_node_size = this._scales[this._node_scale_types.size]
      .copy()
      .range([0, (this._extent_size / 100) * (this._node_size_ratio / 100)])
      .domain(domain_size);

    //Opacité
    this._scale_node_opacity = this._scales[this._node_scale_types.opacity]
      .copy()
      .range([
        parseFloat(nstyle.opacity.varied.min),
        parseFloat(nstyle.opacity.varied.max),
      ])
      .domain([min_opa, max_opa]);
  }

  //LINKS //

  //Creates color groups according to qualitative variable
  create_link_color_groups(links) {
    this._color_groups = {};
    let color_groups = {};
    let indexes = [];

    for (let link of links) {
      //The property according to which the groups are formed
      let prop = link.value;
      if (indexes.length === 0) {
        color_groups[prop] = 0;
        indexes.push(0);
      } else {
        if (color_groups[prop] === undefined) {
          let last_index = indexes[indexes.length - 1];
          if (last_index === 7) {
            color_groups[prop] = 0;
            indexes.push(0);
          } else {
            color_groups[prop] = last_index + 1;
            indexes.push(last_index + 1);
          }
        }
      }
    }

    this._link_color_groups = color_groups;
  }

  linkStyle(link, lstyle) {
    //OPACITY (we need to have rounded numbers)
    let opacity;
    if (lstyle) {
      if (lstyle.opacity.mode === 'fixed') {
        opacity = Math.round(lstyle.opacity.fixed * 100) / 100;
      } else if (lstyle.opacity.mode === 'varied') {
        opacity = Math.round(this.linkOpacityScale(link) * 100) / 100;
        if (opacity === -Infinity) {
          opacity = 0;
        }
      }

      //COLOR
      let stroke;

      if (lstyle.stroke.size != '0') {
        if (link.key.split('->')[0] != link.key.split('->')[1]) {
          stroke = new Stroke({
            color: lstyle.stroke.color,
            width: lstyle.stroke.size,
          });
        }
      }
      if (lstyle.color.mode === 'fixed') {
        // console.log(lstyle)
        return new Style({
          stroke: stroke,
          fill: new Fill({
            color: this.add_opacity_to_color(lstyle.color.fixed, opacity),
          }),
        });
      } else if (lstyle.color.mode === 'varied') {
        //If the type is quantitative, we affect to each node a color of the gradient (equal intervals discretization method)
        if (lstyle.color.varied.type === 'quantitative') {
          // Valeur entre 0 et 8 arrondi à l'entier inférieur
          let color_index = Math.floor(this._scale_link_color(link.value));

          let color_array = lstyle.color.varied.colors;

          return new Style({
            stroke: stroke,
            fill: new Fill({
              color: this.add_opacity_to_color(
                color_array[color_index],
                opacity
              ),
            }),
          });
        }
        //If it's qualitative, we just affect a random color of the palette to each node
        else if (lstyle.color.varied.type === 'qualitative') {
          let color_array = lstyle.color.varied.colors;
          let link_group = link.value;
          color_array[this._link_color_groups[link_group]];
          return new Style({
            stroke: stroke,
            fill: new Fill({
              color: this.add_opacity_to_color(
                color_array[this._link_color_groups[link_group]],
                opacity
              ),
            }),
          });
        }
      }
    }
  }

  linkSize(link, lstyle) {
    if (lstyle.size.mode === 'fixed') {
      return lstyle.size.fixed * (this._extent_size / 1000);
    } else if (lstyle.size.mode === 'varied') {
      if (isNaN(link.value)) {
        return 0;
      }
      if (Number.isNaN(link.value)) {
        return 0;
      }
      if (this._link_scale_types.size === 'Log')
        return this._scale_link_size(link.value + 1);
      else return this._scale_link_size(link.value);
    }
  }

  linkOpacityScale(link) {
    if (this._link_scale_types.opacity === 'Log')
      return this._scale_link_opacity(+link.value + 1);
    else return this._scale_link_opacity(+link.value);
  }
  //Update the variables according to which the color, size, text and opacity will vary
  update_links_var(lstyle) {
    if (lstyle.color.mode === 'varied') {
      this._link_var.color = lstyle.color.varied.var;
    }
    if (lstyle.size.mode === 'varied') {
      console.log(lstyle.size.varied.var);
      this._link_var.size = lstyle.size.varied.var;
      this._link_size_ratio = lstyle.size.varied.maxval;
    }

    if (lstyle.opacity.mode === 'varied') {
      this._link_var.opacity = lstyle.opacity.varied.var;
    }
  }
  update_link_scales_types(lstyle) {
    this._link_scale_types.size = lstyle.size.varied.scale;
    this._link_scale_types.opacity = lstyle.opacity.varied.scale;
  }

  update_links_min_max(links) {
    this.links_min_value = d3.min(links.map((l) => l.value));
    this.links_max_value = d3.max(links.map((l) => l.value));
  }
  //Updates scales for sizing elements according to link_var

  update_links_scales(links, lstyle) {
    //COLORS

    //Pour l'échelle des couleurs
    let max_count = d3.max(links, (n) => parseFloat(n.value));
    let min_count = d3.min(links, (n) => parseFloat(n.value));

    let [min_count_size, max_count_size] = [min_count, max_count];
    let [min_count_opa, max_count_opa] = [min_count, max_count];

    this._scale_link_color = d3
      .scaleLinear()
      //Nombre de couleurs (7.99 car ayant 8 couleurs, l'indice finale ne doit pas dépasser 7)
      .range([0, 7.99])
      .domain([min_count, max_count]);

    //If scale is logarithmic, the range musn't cross zero
    if (
      this._link_scale_types.size === 'Log' ||
      this._link_scale_types.opacity === 'Log'
    ) {
      if (
        this._link_scale_types.size === 'Log' ||
        this._link_scale_types.opacity !== 'Log'
      ) {
        [min_count_size, max_count_size] = this.handle_log_scale_size_range(
          min_count,
          max_count,
          false,
          '#semioLinks'
        );
      } else if (
        this._link_scale_types.size !== 'Log' ||
        this._link_scale_types.opacity === 'Log'
      ) {
        [min_count_opa, max_count_opa] = this.handle_log_scale_opacity_range(
          min_count,
          max_count,
          '#semioLinks'
        );
      } else if (
        this._link_scale_types.size === 'Log' ||
        this._link_scale_types.opacity === 'Log'
      ) {
        [min_count_size, max_count_size] = this.handle_log_scale_size_range(
          min_count,
          max_count,
          true,
          '#semioLinks'
        );
        [min_count_opa, max_count_opa] = this.handle_log_scale_opacity_range(
          min_count,
          max_count,
          '#semioLinks'
        );
      }
    } else {
      $('#semioLinks').modal('hide');
    }

    // definition de l'échelle pour la taille. Le choix est fait de garder un domaine
    //fixe pour éviter le changement de largeur lorsqu'un filtre barchart est activé
    let domain_size;
    if (this._link_scale_types.size === 'Log')
      domain_size = [1, this.links_max_value];
    else domain_size = [this.links_min_value, this.links_max_value];

    // definition de l'échelle pour la taille
    this._scale_link_size = this._scales[this._link_scale_types.size]
      .copy()
      .range([0, (this._extent_size / 100) * (this._link_size_ratio / 100)])
      .domain(domain_size);

    //Opacité

    // definition de l'échelle pour la taille
    let domain_opacity;
    if (this._link_scale_types.opacity === 'Log')
      domain_opacity = [1, max_count_opa];
    else domain_opacity = [min_count_opa, max_count_opa];

    this._scale_link_opacity = this._scales[this._link_scale_types.opacity]
      .copy()
      .range([lstyle.opacity.varied.min, lstyle.opacity.varied.max])
      .domain(domain_opacity);
  }

  create_arrows(links, lstyle) {
    var nodes_hash = this.proj_nodes_hash;

    let orientation = lstyle.shape.orientation;
    let shape_type = lstyle.shape.type;

    // Vérifiez que lstyle contient les propriétés attendues
    if (!lstyle.shape.arrow_head || !lstyle.shape.arrow_curve) {
      console.error(
        'Lstyle ne contient pas les propriétés nécessaires:',
        lstyle
      );
      return [];
    }

    // Attach link width (in px) for the scalability in the legend
    this.update_links_height(links, lstyle);

    let style = {
      geometry: {
        head: {
          height: lstyle.shape.arrow_head.height,
          width: lstyle.shape.arrow_head.width,
        },
        curve: {
          height: lstyle.shape.arrow_curve.height,
          center: lstyle.shape.arrow_curve.center,
        },
      },
      ratioBounds: 0.9,
    };

    let createArrow = (link, arrowFunction) => {
      let from = link.key.split('->')[0];
      let to = link.key.split('->')[1];
      let width = this.linkSize(link, lstyle);

      if (!nodes_hash[from] || !nodes_hash[to]) {
        console.error(`Nœuds manquants pour le lien: ${link.key}`);
        return null;
      }

      let arrow = arrowFunction(
        style,
        nodes_hash[from].center,
        nodes_hash[to].center,
        nodes_hash[from].radius,
        nodes_hash[to].radius,
        width
      );

      return {
        geometry: arrow,
        attributes: link,
      };
    };

    let arrows = links
      .map((link) => {
        if (orientation === 'oriented' && shape_type === 'StraightArrow') {
          return createArrow(link, orientedStraightArrow);
        } else if (
          orientation === 'noOriented' &&
          shape_type === 'StraightArrow'
        ) {
          return createArrow(link, noOrientedStraightArrow);
        } else if (
          orientation === 'oriented' &&
          shape_type === 'StraightNoHookArrow'
        ) {
          return createArrow(link, orientedStraightNoHookArrow);
        } else if (
          orientation === 'oriented' &&
          shape_type === 'TriangleArrow'
        ) {
          return createArrow(link, orientedTriangleArrow);
        } else if (orientation === 'oriented' && shape_type === 'CurveArrow') {
          return createArrow(link, orientedCurveArrow);
        } else if (
          orientation === 'oriented' &&
          shape_type === 'CurveOneArrow'
        ) {
          return createArrow(link, orientedCurveOneArrow);
        } else if (
          orientation === 'noOriented' &&
          shape_type === 'CurveArrow'
        ) {
          return createArrow(link, noOrientedCurveArrow);
        }
        return null;
      })
      .filter((arrow) => arrow !== null);

    return arrows;
  }

  add_links(
    links,
    lstyle,
    link_data_range,
    z_index,
    zoomSaved,
    center,
    newLayer = false
  ) {
    //On fixe le minimum et maximum des valeurs pour la définition des échelles

    if (link_data_range !== undefined) {
      this.links_min_value = link_data_range[0];
      this.links_max_value = link_data_range[1];
    } else {
      this.links_min_value = d3.min(links.map((l) => l.value));
      this.links_max_value = d3.max(links.map((l) => l.value));
    }

    this.update_links_var(lstyle);
    this.update_link_scales_types(lstyle);
    this.update_links_scales(links, lstyle);

    //Useful for qualitative color grouping
    if (lstyle.color.varied.type === 'qualitative') {
      this.create_link_color_groups(links);
    }

    this.map.removeLayer(this.get_layer('links'));

    // Calculer le seuil pour les 75% des liens les plus importants uniquement lors de l'import initial
    let threshold = newLayer
      ? d3.quantile(
          links.map((l) => l.value),
          0.25
        )
      : 0;

    // Filtrer pour ne garder que les liens dont la valeur est supérieure au seuil
    let filtered = newLayer
      ? links.filter(function (a) {
          return a.value >= threshold;
        })
      : links;

    // Ajouter les informations supplémentaires aux entités géographiques + création des fleches
    let arrows = this.create_arrows(filtered, lstyle);

    let links_shapes = [];

    // Afficher le spinner avant le chargement
    document.getElementById('spinnerDiv').style.display = 'flex';
    // Remplacer forEach par for...of
    for (const [i, a] of arrows.entries()) {
      let polygon = new Polygon([a.geometry]);
      let feature = new Feature(polygon);
      feature.setProperties({
        linkData: a.attributes,
      });
      let link_index = arrows.indexOf(a);
      let link = arrows[link_index].attributes;
      feature.setStyle(this.linkStyle(link, lstyle));

      links_shapes.push(feature);
    }
    // Cacher le spinner après le chargement
    document.getElementById('spinnerDiv').style.display = 'none';

    // Ce code s'exécutera après que la boucle soit terminée
    let links_vector = new VectorSource({
      features: links_shapes,
    });
    let linksLayer = new VectorLayer({
      name: 'links',
      source: links_vector,
      // style: this.linkStyle(lstyle),
      renderMode: 'image',
    });
    console.log(z_index);

    // Ensure z_index is treated as an array and retrieve the correct z_index
    if (Array.isArray(z_index) && z_index.length > 0) {
      // Chercher l'élément avec name == 'links'
      const linksZIndex = z_index.find((item) => item.name === 'links');

      if (linksZIndex) {
        linksLayer.setZIndex(linksZIndex.z_index); // Supposant que la valeur est dans .z_index
        console.log('Setting z-index to:', linksZIndex.z_index);
      } else {
        console.warn("No z_index found for 'links'");
        linksLayer.setZIndex(-1); // Valeur par défaut si 'links' n'est pas trouvé
      }
    } else {
      console.log('z_index is not a valid array:', z_index);
      linksLayer.setZIndex(-1); // Valeur par défaut si z_index n'est pas un array valide
    }
    this.map.addLayer(linksLayer);

    // Ajouter un écouteur d'événement pour le survol
    this.map.on('pointermove', function (event) {
      this.getTargetElement().style.cursor = this.hasFeatureAtPixel(event.pixel)
        ? 'pointer'
        : '';
    });

    if (center && zoomSaved) {
      console.log('ca existe');
      this.map.getView().setCenter(center);
      this.map.getView().setZoom(zoomSaved);
    } else {
      const vectorSource = linksLayer.getSource();

      // Vérifiez si la source a des entités
      if (vectorSource.getFeatures().length > 0) {
        const extent = vectorSource.getExtent();

        // Vérifiez si extent est valide
        if (
          extent &&
          extent.length === 4 &&
          isFinite(extent[0]) &&
          isFinite(extent[1]) &&
          isFinite(extent[2]) &&
          isFinite(extent[3])
        ) {
          this.map.getView().fit(extent);
        } else {
          console.error("L'extent n'est pas valide:", extent);
        }
      } else {
        console.error('Aucune entité dans le vector layer');
      }
    }

    const self = this;
    // Ajouter un gestionnaire d'événements de clic aux polygones
    this.map.on('click', function (evt) {
      self.add_popup_links(evt);
    });
  }

  add_popup_links(evt) {
    let popup = this._popup;
    /**
     * Elements that make up the popup.
     */
    const container = document.getElementById('popup');
    const content = document.getElementById('popup-content');
    const closer = document.getElementById('popup-closer');

    // Ajouter un événement de clic pour fermer le popup
    closer.addEventListener('click', function (event) {
      event.preventDefault(); // Empêcher le comportement par défaut du lien
      container.style.display = 'none'; // Cacher le popup
    });

    // Déterminer le layer sur lequel le clic s'est produit
    this.map.forEachFeatureAtPixel(
      evt.pixel,
      function (feature, layer) {
        if (layer && layer.get('name') === 'links') {
          if (feature) {
            // Sélection de l'élément select
            var selectElement = document.getElementById(
              'semioSelectorSizeChangelink'
            );
            var selectedValue = selectElement ? selectElement.value : 'count';

            // Construire le contenu du popup avec les informations de l'entité
            console.log(feature);
            let popupContent =
              '<h4 class="popup-title" > ID : ' +
              feature.get('linkData').key +
              '</h4>';
            popupContent += '<hr>';
            popupContent += '<table class="popup-table table table-striped">';
            let i = 0;

            for (var key in feature.get('linkData')) {
              if (key !== 'key') {
                let value = feature.get('linkData')[key];
                let formattedValue =
                  typeof value === 'number' && !isNaN(value)
                    ? value.toFixed(2)
                    : value;
                popupContent +=
                  '<tr class="' +
                  (i % 2 === 0 ? '' : 'table-secondary') +
                  '"><td class="popup-key" style="padding: 0.35em;">' +
                  key +
                  '</td><td class="popup-value" style="padding: 0.35em;">' +
                  formattedValue +
                  '</td></tr>';
                i++;
              }
            }
            popupContent += '</table>';

            // Mettre à jour le contenu du popup
            content.innerHTML = popupContent;

            // Définir la position du popup sur le clic de la souris
            popup.setPosition(evt.coordinate);

            // Afficher le popup
            container.style.display = 'block';
          } else {
            // Si aucun entité n'a été cliqué, cacher le popup
            container.style.display = 'none';
          }
        }
      },
      {
        hitTolerance: 5, // Augmenter la tolérance de détection
      }
    );
  }

  update_links(links, lstyle, z_index) {
    //Update the discretization variable
    this.update_links_var(lstyle);

    this.update_links_min_max(links);
    //Update scale types for size and opacity (linear, pow etc)
    this.update_link_scales_types(lstyle);
    //update the actual scales
    this.update_links_scales(links, lstyle);

    //Useful for qualitative color grouping
    if (lstyle.color.varied.type === 'qualitative') {
      this.create_link_color_groups(links);
    }

    this.map.removeLayer(this.get_layer('links'));
    // Ajouter les informations supplémentaires aux entités géographiques + création des fleches
    let arrows = this.create_arrows(links, lstyle);
    let links_shapes = arrows.map((a, i) => {
      let polygon = new Polygon([a.geometry]);
      let feature = new Feature(polygon);
      // Ajout des attributs comme dans add_links
      feature.setProperties({
        linkData: a.attributes,
      });
      let link_index = arrows.indexOf(a);
      // Ajouter les informations supplémentaires aux entités géographiques
      let link = arrows[link_index].attributes;
      feature.setStyle(this.linkStyle(link, lstyle));

      return feature;
    }, this);

    let links_vector = new VectorSource({
      features: links_shapes,
    });
    let linksLayer = new VectorLayer({
      name: 'links',
      source: links_vector,
      style: this.linkStyle(lstyle),
      renderMode: 'image',
    });
    this.map.addLayer(linksLayer);
    linksLayer.setZIndex(z_index);

    const self = this;
    // Ajouter un gestionnaire d'événements de clic aux polygones
    this.map.on('click', function (evt) {
      self.add_popup_links(evt);
    });
  }

  set_projection(proj, nodes, links, config, link_data_range) {
    let olproj = getProjection(proj);

    const item = global.projections[proj].extent;
    olproj.setExtent(item);

    let newProjExtent = olproj.getExtent();

    this.map.setView(
      new View({
        center: config.center,
        zoom: config.zoom,
        projection: olproj,
        minZoom: -3,
        multiWorld: false,
      })
    );

    //Reprojecting geojson and baselayers
    //Selecting every vectorlayers other than nodes and links (so geojson or baselayers)
    for (let vectorLayer of this.map.getLayers().array_.filter((l) => {
      return (
        l instanceof VectorLayer ||
        l.values_.name !== 'nodes' ||
        l.values_.name !== 'links'
      );
    })) {
      const layer_name = vectorLayer.values_.name;
      const model_layer = config.layers.filter((l) => l.name === layer_name)[0];

      let layer_style;
      if (model_layer.type === 'geojson') {
        layer_style = config.styles.geojson[layer_name];
        this.map.removeLayer(vectorLayer);
        this.add_geojson_layer(model_layer, layer_style);
      } else if (model_layer.type === 'baselayer') {
        //To complete when baselayer adding will be implemented
        layer_style = config.styles.baselayer[layer_name];
      }
    }

    let nstyle = config.styles.nodes;
    let lstyle = config.styles.links;
    let layer_z_indexes = this.get_layer_z_indexes(
      this.map.getLayers().getArray()
    );
    this.add_nodes(nodes, nstyle, layer_z_indexes.nodes);
    this.add_links(
      links,
      lstyle,
      link_data_range,
      layer_z_indexes.links,
      config.zoom,
      config.center,
      false
    );
  }

  render(nodes, links, nstyle, lstyle, link_data_range) {
    let layer_z_indexes = this.get_layer_z_indexes(
      this.map.getLayers().getArray()
    );
    let zoom = this.map.getView().getZoom();
    let center = this.map.getView().getCenter();
    //Envoyer les z-index aux nodes et aux links
    this.add_nodes(nodes, nstyle, layer_z_indexes.nodes);
    this.add_links(
      links,
      lstyle,
      link_data_range,
      layer_z_indexes.links,
      zoom,
      center,
      false // newLayer = false pour les mises à jour
    );
  }

  get_layer_z_indexes(map_layers) {
    let layer_z_indexes = {};
    for (let layer of map_layers) {
      if (layer instanceof VectorLayer) {
        let layer_name = layer.values_.name;
        if (layer_name === 'nodes' || layer_name === 'links') {
          layer_z_indexes[layer_name] = layer.getZIndex();
        }
      }
    }
    return layer_z_indexes;
  }

  //LAYERS //

  get_layer(name) {
    let layers = this.map.getLayers().getArray();
    for (let i = 0; i < layers.length; i++) {
      if (layers[i].values_.name == name) {
        return layers[i];
      }
    }
  }
  add_tile_layer(layer) {
    let url;
    let source;
    if (layer.name === 'OSM') {
      source = new OSM();
      // url = "http://{s}.tile.opentopomap.org/{z}/{x}/{y}.png";
    } else if (layer.name === 'Humanitarian_OSM') {
      url = 'http://{a-b}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png';
      source = new XYZ({ url: url, crossOrigin: 'Anonymous' });
    } else if (layer.name === 'Wikimedia') {
      url = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
      source = new XYZ({ url: url, crossOrigin: 'Anonymous' });
    } else if (layer.name === 'Stamen_without_labels') {
      url =
        'http://stamen-tiles-{a-d}.a.ssl.fastly.net/terrain-background/{z}/{x}/{y}.png';
      source = new XYZ({ url: url, crossOrigin: 'Anonymous' });
    } else if (layer.name === 'Stamen_Light') {
      url =
        'http://tiles.stadiamaps.com/tiles/stamen_toner_lite/{z}/{x}/{y}.png?api_key=8bc2069e-6d06-44c0-b43e-4b7de4bbcc3a';
      source = new XYZ({ url: url, crossOrigin: 'Anonymous' });
    } else if (layer.name === 'CartoDB Light') {
      url = 'http://{1-4}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png';
      source = new XYZ({ url: url, crossOrigin: 'Anonymous' });
    } else if (layer.name === 'CartoDB_Voyager_no_label') {
      url =
        'http://{1-4}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}.png';
      source = new XYZ({ url: url, crossOrigin: 'Anonymous' });
    } else if (layer.name === 'CartoDB_Voyager_labeled') {
      url =
        'http://{1-4}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}.png';
      source = new XYZ({ url: url, crossOrigin: 'Anonymous' });
    } else if (layer.name === 'Stamen_terrain') {
      url =
        'http://tiles.stadiamaps.com/tiles/stamen_terrain/{z}/{x}/{y}.png?api_key=8bc2069e-6d06-44c0-b43e-4b7de4bbcc3a';
      source = new XYZ({ url: url, crossOrigin: 'Anonymous' });
    } else if (layer.name === 'Stamen_watercolor') {
      url =
        'http://tiles.stadiamaps.com/tiles/stamen_watercolor/{z}/{x}/{y}.jpg?api_key=8bc2069e-6d06-44c0-b43e-4b7de4bbcc3a';
      source = new XYZ({ url: url, crossOrigin: 'Anonymous' });
    } else if (layer.name === 'Stadia_Stamen_Dark') {
      url =
        'http://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}.png?api_key=8bc2069e-6d06-44c0-b43e-4b7de4bbcc3a';
      source = new XYZ({ url: url, crossOrigin: 'Anonymous' });
    } else if (layer.name === 'ESRI_World_Street_map') {
      url =
        'http://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}';
      source = new XYZ({ url: url, crossOrigin: 'Anonymous' });
    } else if (layer.name === 'ESRI_World_Topo_map') {
      url =
        'http://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}';
      source = new XYZ({ url: url, crossOrigin: 'Anonymous' });
    } else if (layer.name === 'ESRI_World_Imagery') {
      url =
        'http://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      source = new XYZ({ url: url, crossOrigin: 'Anonymous' });
    } else if (layer.name === 'ESRI_NatGeo_World') {
      url =
        'http://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}';
      source = new XYZ({ url: url, crossOrigin: 'Anonymous' });
    }

    let tileLayer = new TileLayer({
      name: layer.name,
      source: source,
    });
    tileLayer.setZIndex(layer.z_index);
    this.map.addLayer(tileLayer);
  }
  geojson_styles(style, type) {
    var image = new CircleStyle({
      radius: 5,
      fill: new Fill({
        color: this.add_opacity_to_color(style.fill, style.opacity),
      }),
      stroke: new Stroke({
        color: this.add_opacity_to_color(style.border, style.opacity),
        width: 1,
      }),
    });

    let styles = {
      Point: new Style({
        image: image,
      }),
      LineString: new Style({
        stroke: new Stroke({
          color: this.add_opacity_to_color(style.fill, style.opacity),
          width: 1,
        }),
      }),
      MultiLineString: new Style({
        stroke: new Stroke({
          color: this.add_opacity_to_color(style.fill, style.opacity),
          width: 1,
        }),
      }),
      MultiPoint: new Style({
        image: image,
      }),
      MultiPolygon: new Style({
        stroke: new Stroke({
          color: this.add_opacity_to_color(style.border, style.opacity),
          width: 1,
        }),
        fill: new Fill({
          color: this.add_opacity_to_color(style.fill, style.opacity),
        }),
      }),
      Polygon: new Style({
        stroke: new Stroke({
          color: this.add_opacity_to_color(style.border, style.opacity),
          lineDash: [4],
          width: 3,
        }),
        fill: new Fill({
          color: this.add_opacity_to_color(style.fill, style.opacity),
        }),
      }),
      GeometryCollection: new Style({
        stroke: new Stroke({
          color: this.add_opacity_to_color(style.border, style.opacity),
          width: 2,
        }),
        fill: new Fill({
          color: this.add_opacity_to_color(style.fill, style.opacity),
        }),
        image: new CircleStyle({
          radius: 10,
          fill: new Fill({ color: style.fill }),
          stroke: new Stroke({
            color: this.add_opacity_to_color(style.border, style.opacity),
          }),
        }),
      }),
      Circle: new Style({
        stroke: new Stroke({
          color: this.add_opacity_to_color(style.border, style.opacity),
          width: 2,
        }),
        fill: new Fill({
          color: this.add_opacity_to_color(style.fill, style.opacity),
        }),
      }),
    };

    return styles[type];
  }
  add_geojson_layer(layer, style) {
    let type;
    if ((style.type = 'FeatureCollection'))
      type = style.file.features[0].geometry.type;
    else type = style.type;

    let features = new GeoJSON({
      extractGeometryName: true,
      featureProjection: this.map.getView().getProjection().getCode(),
    }).readFeatures(style.file);

    let geostyle = this.geojson_styles(style, type);

    var vectorSource = new VectorSource({
      features: features,
    });

    var vectorLayer = new VectorLayer({
      source: vectorSource,
      style: geostyle,
      name: layer.name,
    });
    vectorLayer.setZIndex(layer.z_index);
    console.log(layer);
    this.map.addLayer(vectorLayer);
  }

  render_layers(layers, styles, center, zoom) {
    for (let layer of layers) {
      //Skip the iteration if it's nodes or links (they are added in add_nodes and add_links functions)
      if (layer.name !== 'nodes' || layer.name !== 'links') {
        if (layer.type === 'tile') {
          this.add_tile_layer(layer);
        } else if (layer.type === 'geojson') {
          const style = styles.geojson[layer.name];
          this.add_geojson_layer(layer, style);
        }
      }
    }
  }

  update_layer_style(layer_name, new_semio) {
    let layer = this.map
      .getLayers()
      .array_.filter((lay) => lay.values_.name === layer_name)[0];
    let type = layer.getSource().getFeatures()[0].getGeometry().getType();
    layer.setStyle(this.geojson_styles(new_semio, type));
  }
  update_map_z_indexes(layers) {
    let z_indexes = {};
    for (let l of layers) {
      z_indexes[l.name] = l.z_index;
    }

    for (let layer of this.map.getLayers().array_) {
      layer.setZIndex(z_indexes[layer.values_.name]);
    }
  }

  updateLinkSize(selectedValue) {
    this.map.getLayers().forEach((layer) => {
      if (layer.get('name') === 'links') {
        this.update_links_style(layer, selectedValue);
      }
    });
  }

  update_links_style(layer, size) {
    const features = layer.getSource().getFeatures();
    features.forEach((feature) => {
      const style = feature.getStyle();
      const stroke = style.getStroke();
      stroke.setWidth(size); // Modifier la largeur du trait
      feature.setStyle(style);
    });
  }
}

//LINKS SHAPE //

function tranposeLine(point_ori, point_dest, distance) {
  var startX = point_ori[0];
  var startY = point_ori[1];
  var endX = point_dest[0];
  var endY = point_dest[1];
  var angle = Math.atan2(endY - startY, endX - startX);

  var NewOri = [
    Math.sin(angle) * distance + startX,
    -Math.cos(angle) * distance + startY,
  ];
  var Newdest = [
    Math.sin(angle) * distance + endX,
    -Math.cos(angle) * distance + endY,
  ];

  return [NewOri, Newdest];
}

function getIntersection(ori, dest, radius) {
  var startX = ori[0];
  var startY = ori[1];
  var endX = dest[0];
  var endY = dest[1];
  var angle = Math.atan2(endY - startY, endX - startX);

  return [Math.cos(angle) * radius + startX, Math.sin(angle) * radius + startY];
}

function transposePointVerticalyFromLine(point_ori, linePoints, distance) {
  var startX = linePoints[0][0];
  var startY = linePoints[0][1];
  var endX = linePoints[1][0];
  var endY = linePoints[1][1];
  var angle = Math.atan2(endY - startY, endX - startX);
  return [
    Math.sin(angle) * distance + point_ori[0],
    -Math.cos(angle) * distance + point_ori[1],
  ];
}

function drawLine(path, iteration) {
  var numIterations = iteration;
  while (numIterations > 0) {
    path = smooth(path);
    numIterations--;
  }
  return path;
}

// create a simple arrow with en triangle head at a given ratio of the distance
function orientedStraightArrow(style, ori, dest, rad_ori, rad_dest, width) {
  var startX = ori[0];
  var startY = ori[1];
  var endX = dest[0];
  var endY = dest[1];
  var angle = Math.atan2(endY - startY, endX - startX);

  var reducePointdest = getIntersection(dest, ori, rad_dest);
  var reducePointOri = getIntersection(ori, dest, rad_ori);

  var heigth_arrow = style.geometry.head.height;
  var widthArrow = style.geometry.head.width;

  var dist = Math.sqrt(
    (reducePointdest[0] - reducePointOri[0]) *
      (reducePointdest[0] - reducePointOri[0]) +
      (reducePointdest[1] - reducePointOri[1]) *
        (reducePointdest[1] - reducePointOri[1])
  );
  var baseArrow = tranposeLine(
    reducePointOri,
    reducePointdest,
    2.5 * style.ratioBounds
  );

  var testWidth = Math.min(heigth_arrow * width + width, 0.5 * dist);

  var topArrowpoint = getIntersection(baseArrow[1], baseArrow[0], testWidth);
  var polyPoint = tranposeLine(baseArrow[0], topArrowpoint, width);
  var topArrowpoint = tranposeLine(
    baseArrow[0],
    topArrowpoint,
    width + widthArrow * width
  )[1];

  return [
    baseArrow[0],
    baseArrow[1],
    topArrowpoint,
    polyPoint[1],
    polyPoint[0],
    baseArrow[0],
  ];
}
// créer une flèche simple avec une tête triangulaire à un ratio donné de la distance
function noOrientedStraightArrow(style, ori, dest, rad_ori, rad_dest, width) {
  var startX = ori[0];
  var startY = ori[1];
  var endX = dest[0];
  var endY = dest[1];
  var angle = Math.atan2(endY - startY, endX - startX);

  var reducePointdest = getIntersection(dest, ori, rad_dest);
  var reducePointOri = getIntersection(ori, dest, rad_ori);

  var baseArrow = tranposeLine(reducePointOri, reducePointdest, width / 2);
  var topArrow = tranposeLine(reducePointdest, reducePointOri, width / 2);

  return baseArrow.concat(topArrow).concat([baseArrow[0]]);
}

function orientedStraightNoHookArrow(
  style,
  ori,
  dest,
  rad_ori,
  rad_dest,
  width
) {
  var startX = ori[0];
  var startY = ori[1];
  var endX = dest[0];
  var endY = dest[1];
  var angle = Math.atan2(endY - startY, endX - startX);

  var reducePointdest = getIntersection(dest, ori, rad_dest);
  var reducePointOri = getIntersection(ori, dest, rad_ori);

  var heigth_arrow = style.geometry.head.height;
  var widthArrow = style.geometry.head.width;

  var dist = Math.sqrt(
    (reducePointdest[0] - reducePointOri[0]) *
      (reducePointdest[0] - reducePointOri[0]) +
      (reducePointdest[1] - reducePointOri[1]) *
        (reducePointdest[1] - reducePointOri[1])
  );
  var baseArrow = tranposeLine(
    reducePointOri,
    reducePointdest,
    2.5 * style.ratioBounds
  );

  // var percentDist = heigth_arrow * Math.sqrt((endX - startX) * (endX - startX) + (endY - startY) * (endY - startY))
  //distance = Math.sqrt( (endX - startX)*(endX - startX )+ (endY - startY)*(endY - startY) ) * ratio_Arrow_Line;

  // var heigth_arrow = Math.min(heigth_arrow *width + width , 0.5* dist)
  //
  var testWidth = Math.min(heigth_arrow * width + width, 0.5 * dist);
  // topArrowpoint = [Math.cos(angle) * distance + startX, Math.sin(angle) * distance + startY]
  var topArrowpoint = getIntersection(baseArrow[1], baseArrow[0], testWidth);
  var polyPoint = tranposeLine(baseArrow[0], topArrowpoint, width);

  // topArrowpoint = transposePointVerticalyFromLine(topArrowpoint, [baseArrow[0], baseArrow[1]], width + widthArrow * width )

  return [baseArrow[0], baseArrow[1], polyPoint[1], polyPoint[0], baseArrow[0]];
}

function orientedTriangleArrow(style, ori, dest, rad_ori, rad_dest, width) {
  var startX = ori[0];
  var startY = ori[1];
  var endX = dest[0];
  var endY = dest[1];
  var angle = Math.atan2(endY - startY, endX - startX);

  var reducePointdest = getIntersection(dest, ori, rad_dest);
  var reducePointOri = getIntersection(ori, dest, rad_ori);

  var heigth_arrow = 0.5;
  // var widthArrow = style.geometry.head.width;

  var dist = Math.sqrt(
    (reducePointdest[0] - reducePointOri[0]) *
      (reducePointdest[0] - reducePointOri[0]) +
      (reducePointdest[1] - reducePointOri[1]) *
        (reducePointdest[1] - reducePointOri[1])
  );
  var baseArrow = tranposeLine(
    reducePointOri,
    reducePointdest,
    style.ratioBounds / 2
  );

  // var percentDist = heigth_arrow * Math.sqrt((endX - startX) * (endX - startX) + (endY - startY) * (endY - startY))
  //distance = Math.sqrt( (endX - startX)*(endX - startX )+ (endY - startY)*(endY - startY) ) * ratio_Arrow_Line;

  // var heigth_arrow = Math.min(heigth_arrow *width + width , 0.5* dist)

  var testWidth = Math.min(heigth_arrow * width + width, dist);
  // topArrowpoint = [Math.cos(angle) * distance + startX, Math.sin(angle) * distance + startY]
  var topArrowpoint = getIntersection(
    reducePointdest,
    reducePointOri,
    testWidth
  );
  var polyPoint = tranposeLine(baseArrow[0], topArrowpoint, width);

  // topArrowpoint = transposePointVerticalyFromLine(topArrowpoint, [baseArrow[0], baseArrow[1]], width + widthArrow * width )

  return [baseArrow[0], baseArrow[1], polyPoint[0], baseArrow[0]];
}

function orientedCurveArrow(style, ori, dest, rad_ori, rad_dest, width) {
  var base_curve = style.geometry.curve.center;
  var height_curve = style.geometry.curve.height;
  var heigth_arrow = style.geometry.head.height;
  var widthArrow = style.geometry.head.width;

  var startX = ori[0];
  var startY = ori[1];
  var endX = dest[0];
  var endY = dest[1];
  var angle = Math.atan2(endY - startY, endX - startX);

  // compute the point from
  var reducePointdest = getIntersection(dest, ori, rad_dest);
  var reducePointOri = getIntersection(ori, dest, rad_ori);

  var dist =
    base_curve *
    Math.sqrt(
      (reducePointdest[0] - reducePointOri[0]) *
        (reducePointdest[0] - reducePointOri[0]) +
        (reducePointdest[1] - reducePointOri[1]) *
          (reducePointdest[1] - reducePointOri[1])
    );
  var base_curve_point = [
    -Math.cos(angle) * dist + reducePointdest[0],
    -Math.sin(angle) * dist + reducePointdest[1],
  ];

  // get Origin from the radius of the current nodes
  var center_curve_point = transposePointVerticalyFromLine(
    base_curve_point,
    [ori, dest],
    height_curve * dist
  );
  var max_curve_point = transposePointVerticalyFromLine(
    base_curve_point,
    [ori, dest],
    height_curve * dist + width / 2
  );
  var min_curve_point = transposePointVerticalyFromLine(
    base_curve_point,
    [ori, dest],
    height_curve * dist - width / 2
  );
  var newOri = getIntersection(ori, center_curve_point, rad_ori);
  var heigth_arrow = Math.min(heigth_arrow * width + width, 0.5 * dist);
  var newDest = getIntersection(
    dest,
    center_curve_point,
    rad_dest + heigth_arrow
  ); // The height of the arrow is added tested to see the result
  var pointArrow = getIntersection(dest, center_curve_point, rad_dest);
  //Compute the base
  var angleFirst = Math.atan2(
    center_curve_point[1] - ori[1],
    center_curve_point[0] - ori[0]
  );
  var angleSecond = Math.atan2(
    center_curve_point[1] - dest[1],
    center_curve_point[0] - dest[0]
  );
  var extremPointArrow = [
    transposePointVerticalyFromLine(
      newDest,
      [newDest, center_curve_point],
      width / 2 + widthArrow * (width / 2)
    ),
    transposePointVerticalyFromLine(
      newDest,
      [newDest, center_curve_point],
      -(width / 2 + (widthArrow * width) / 2)
    ),
  ];

  newOri = [
    transposePointVerticalyFromLine(
      newOri,
      [newOri, center_curve_point],
      width / 2
    ),
    transposePointVerticalyFromLine(
      newOri,
      [newOri, center_curve_point],
      -width / 2
    ),
  ];
  newDest = [
    transposePointVerticalyFromLine(
      newDest,
      [newDest, center_curve_point],
      width / 2
    ),
    transposePointVerticalyFromLine(
      newDest,
      [newDest, center_curve_point],
      -width / 2
    ),
  ];

  var pathLow = [newOri[1], min_curve_point, newDest[0]];
  var pathHigh = [newDest[1], max_curve_point, newOri[0]];
  // draw the curve line
  pathLow = drawLine(pathLow, 5);
  pathHigh = drawLine(pathHigh, 5);

  //draw the arrow .concat([extremPointArrow[1]]).concat([pointArrow]).concat([extremPointArrow[0]])

  var Polygone = pathLow
    .concat([extremPointArrow[0]])
    .concat([pointArrow])
    .concat([extremPointArrow[1]])
    .concat(pathHigh)
    .concat([pathLow[0]]);
  return Polygone;
}

function orientedCurveOneArrow(style, ori, dest, rad_ori, rad_dest, width) {
  var base_curve = style.geometry.curve.center;
  var height_curve = style.geometry.curve.height;
  var heigth_arrow = style.geometry.head.height;
  var widthArrow = style.geometry.head.width;

  var startX = ori[0];
  var startY = ori[1];
  var endX = dest[0];
  var endY = dest[1];
  var angle = Math.atan2(endY - startY, endX - startX);

  // compute the point from
  var reducePointdest = getIntersection(dest, ori, rad_dest);
  var reducePointOri = getIntersection(ori, dest, rad_ori);
  var dist =
    base_curve *
    Math.sqrt(
      (reducePointdest[0] - reducePointOri[0]) *
        (reducePointdest[0] - reducePointOri[0]) +
        (reducePointdest[1] - reducePointOri[1]) *
          (reducePointdest[1] - reducePointOri[1])
    );
  var base_curve_point = [
    -Math.cos(angle) * dist + reducePointdest[0],
    -Math.sin(angle) * dist + reducePointdest[1],
  ];
  // get Origin from the radius of the current nodes
  var center_curve_point = transposePointVerticalyFromLine(
    base_curve_point,
    [ori, dest],
    height_curve * dist
  );
  var max_curve_point = transposePointVerticalyFromLine(
    base_curve_point,
    [ori, dest],
    height_curve * dist + width / 2
  );
  var min_curve_point = transposePointVerticalyFromLine(
    base_curve_point,
    [ori, dest],
    height_curve * dist - width / 2
  );
  var newOri = getIntersection(ori, center_curve_point, rad_ori);
  // var heigth_arrow = Math.min(heigth_arrow *width + width , 0.5* dist)
  var newDest = getIntersection(dest, center_curve_point, rad_dest); // The height of the arrow is added tested to see the result
  var pointArrow = getIntersection(dest, center_curve_point, rad_dest);
  //Compute the base
  var angleFirst = Math.atan2(
    center_curve_point[1] - ori[1],
    center_curve_point[0] - ori[0]
  );
  var angleSecond = Math.atan2(
    center_curve_point[1] - dest[1],
    center_curve_point[0] - dest[0]
  );
  // var extremPointArrow = [transposePointVerticalyFromLine(newDest, [newDest,center_curve_point], width /2 +widthArrow * (width /2)), transposePointVerticalyFromLine(newDest, [newDest,center_curve_point], -(width /2 +(widthArrow *width/2))) ]

  newOri = [
    transposePointVerticalyFromLine(
      newOri,
      [newOri, center_curve_point],
      width
    ),
    transposePointVerticalyFromLine(
      newOri,
      [newOri, center_curve_point],
      -width
    ),
  ];
  // newDest = [transposePointVerticalyFromLine(newDest, [newDest,center_curve_point], width/2), transposePointVerticalyFromLine(newDest, [newDest,center_curve_point], - width/2) ]

  var pathLow = [newOri[1], min_curve_point, pointArrow];
  var pathHigh = [pointArrow, max_curve_point, newOri[0]];
  // draw the curve line
  pathLow = drawLine(pathLow, 5);
  pathHigh = drawLine(pathHigh, 5);

  //draw the arrow .concat([extremPointArrow[1]]).concat([pointArrow]).concat([extremPointArrow[0]])

  var Polygone = pathHigh.concat(pathLow);
  return Polygone;
}

function noOrientedCurveArrow(style, ori, dest, rad_ori, rad_dest, width) {
  var base_curve = style.geometry.curve.center;
  var height_curve = style.geometry.curve.height;

  var startX = ori[0];
  var startY = ori[1];
  var endX = dest[0];
  var endY = dest[1];
  var angle = Math.atan2(endY - startY, endX - startX);

  // compute the point from
  var reducePointdest = getIntersection(dest, ori, rad_dest);
  var reducePointOri = getIntersection(ori, dest, rad_ori);

  var dist =
    base_curve *
    Math.sqrt(
      (reducePointdest[0] - reducePointOri[0]) *
        (reducePointdest[0] - reducePointOri[0]) +
        (reducePointdest[1] - reducePointOri[1]) *
          (reducePointdest[1] - reducePointOri[1])
    );
  var base_curve_point = [
    -Math.cos(angle) * dist + reducePointdest[0],
    -Math.sin(angle) * dist + reducePointdest[1],
  ];

  // get Origin from the radius of the current nodes
  var center_curve_point = transposePointVerticalyFromLine(
    base_curve_point,
    [ori, dest],
    height_curve * dist
  );
  var max_curve_point = transposePointVerticalyFromLine(
    base_curve_point,
    [ori, dest],
    height_curve * dist + width / 2
  );
  var min_curve_point = transposePointVerticalyFromLine(
    base_curve_point,
    [ori, dest],
    height_curve * dist - width / 2
  );
  var newOri = getIntersection(ori, center_curve_point, rad_ori);
  var newDest = getIntersection(dest, center_curve_point, rad_dest); // The height of the arrow is added tested to see the result
  // var pointArrow = getIntersection(dest,center_curve_point,rad_dest)
  //Compute the base
  var angleFirst = Math.atan2(
    center_curve_point[1] - ori[1],
    center_curve_point[0] - ori[0]
  );
  var angleSecond = Math.atan2(
    center_curve_point[1] - dest[1],
    center_curve_point[0] - dest[0]
  );
  // var extremPointArrow = [transposePointVerticalyFromLine(newDest, [dest,center_curve_point], width /2 ), transposePointVerticalyFromLine(newDest, [dest,center_curve_point], -(width /2)) ]
  newOri = [
    transposePointVerticalyFromLine(
      newOri,
      [ori, center_curve_point],
      width / 2
    ),
    transposePointVerticalyFromLine(
      newOri,
      [ori, center_curve_point],
      -width / 2
    ),
  ];
  newDest = [
    transposePointVerticalyFromLine(
      newDest,
      [dest, center_curve_point],
      width / 2
    ),
    transposePointVerticalyFromLine(
      newDest,
      [dest, center_curve_point],
      -width / 2
    ),
  ];

  var pathLow = [newOri[1], min_curve_point, newDest[0]];
  var pathHigh = [newDest[1], max_curve_point, newOri[0]];
  // draw the curve line
  pathLow = drawLine(pathLow, 5);
  pathHigh = drawLine(pathHigh, 5);

  //draw the arrow .concat([extremPointArrow[1]]).concat([pointArrow]).concat([extremPointArrow[0]])

  var Polygone = pathLow.concat(pathHigh).concat([pathLow[0]]);
  return Polygone;
}

function handleLinkSizeChange() {
  const selectedValue = document.getElementById('semioSelectorSizeChangeLink')
    .value;
  updateLinksSize(selectedValue);
}
