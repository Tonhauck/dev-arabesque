global.projections = {
  'Mercator / EPSG:3857': {
    name: 'Mercator / EPSG:3857',
    proj4:
      '+proj=merc +a=6371000 +b=6371000 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +no_defs',
    extent: null,
  },
  'Sphere Mollweide / ESRI:53009': {
    name: 'Sphere Mollweide / ESRI:53009',
    proj4:
      '+proj=moll +lon_0=0 +x_0=0 +y_0=0 +a=6371000 +b=6371000 +units=m +no_defs',
    extent: [-18e6, -9e6, 18e6, 9e6],
    worldExtent: [-179, -89.99, 179, 89.99],
  },
  'RGF93 / Lambert-93 -- France': {
    name: 'RGF93 / Lambert-93 -- France',
    proj4:
      '+proj=lcc +lat_1=49 +lat_2=44 +lat_0=46.5 +lon_0=3 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
    // extent: [-378305.81, 6093283.21, 1212610.74, 7186901.68]
  },
  'ETRS89 / LAEA Europe': {
    name: 'ETRS89 / LAEA Europe',
    proj4:
      '+proj=laea +lat_0=52 +lon_0=10 +x_0=4321000 +y_0=3210000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
  },
  'World Azimuthal Equidistant': {
    name: 'World Azimuthal Equidistant',
    proj4:
      '+proj=aeqd +lat_0=0 +lon_0=0 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs',
    extent: null,
  },
  'Transversal Mercator': {
    name: 'Transversal Mercator',
    proj4:
      '+proj=tmerc +lat_0=0 +lon_0=6 +k=1 +x_0=2500000 +y_0=0 +ellps=bessel +towgs84=598.1,73.7,418.2,0.202,0.045,-2.455,6.7 +units=m +no_defs',
    // extent: [370753.1145, 6382922.7769, 739245.6, 6624811.0577],
  },
  'EPSG:5479': {
    name: 'EPSG:5479',
    proj4:
      '+proj=lcc +lat_1=-76.66666666666667 +lat_2=-79.33333333333333 +lat_0=-78 +lon_0=163 +x_0=7000000 +y_0=5000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
    // extent: [6825737.53, 4189159.8, 9633741.96, 5782472.71],
  },
  'World Mollweide / EPSG:54009': {
    name: 'World Mollweide / EPSG:54009',
    proj4: '+proj=moll +lon_0=0 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs',
    // extent: [-18e6, -9e6, 18e6, 9e6],
  },
  'Quadrilateralized Spherical Cube': {
    name: 'Quadrilateralized Spherical Cube',
    proj4: '+proj=qsc +units=m +no_defs',
    extent: [-18e6, -9e6, 18e6, 9e6],
  },

  'Mollweide internationale Sinusoïdale': {
    name: 'Mollweide internationale Sinusoïdale',
    proj4:
      '+proj=sinu +lon_0=0 +x_0=0 +y_0=0 +a=6371000 +b=6371000 +units=m +no_defs',
    extent: [-18e6, -9e6, 18e6, 9e6],
  },

  'Equidistant Conic': {
    name: 'Equidistant Conic',
    proj4:
      '+proj=eqdc +lon_0=0 +lat_0=0 +x_0=0 +y_0=0 +lat_1=55 +lat_2=60 +units=m +no_defs',
    extent: null,
  },
  'Gall Peters': {
    name: 'Gall Peters',
    proj4:
      '+proj=cea +lon_0=0 +lat_ts=45 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs +ellps=WGS84',
    extent: [-20037508.34, -10018754.17, 20037508.34, 10018754.17], // Extent in meters
    worldExtent: [-180, -90, 180, 90], // Extent in degrees
  },
  'Lambert cylindrical equal-area': {
    name: 'Lambert cylindrical equal-area',
    proj4:
      '+proj=cea +lon_0=0 +lat_ts=0 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs +ellps=WGS84',
    extent: [-20037508.34, -10018754.17, 20037508.34, 10018754.17], // Extent in meters
    worldExtent: [-180, -90, 180, 90], // Extent in degrees
  },

  'Lambert Conformal Conic': {
    name: 'Lambert Conformal Conic',
    proj4:
      '+proj=lcc +lat_1=33 +lat_2=45 +lat_0=39 +lon_0=-96 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs',
    extent: [-20037508.34, -20037508.34, 20037508.34, 20037508.34], // Approximate global extent in meters
    worldExtent: [-180, -90, 180, 90], // Global extent in degrees
  },
  'Natural Earth': {
    name: 'Natural Earth',
    proj4:
      '+proj=eqearth +lon_0=0 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs',
    extent: [-20037508.34, -10018754.17, 20037508.34, 10018754.17], // Extent in meters
    worldExtent: [-180, -90, 180, 90], // Extent in degrees
  },
  Equirectangular: {
    name: 'Equirectangular',
    proj4:
      '+proj=eqc +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs',
    extent: [-20037508.34, -10018754.17, 20037508.34, 10018754.17], // Extent in meters
    worldExtent: [-180, -90, 180, 90], // Extent in degrees
  },
  Polyconic: {
    name: 'Polyconic',
    proj4:
      '+proj=poly +lat_0=0 +lon_0=0 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs +ellps=WGS84',
    extent: [-20037508.34, -10018754.17, 20037508.34, 10018754.17], // Extent in meters
    worldExtent: [-180, -90, 180, 90], // Extent in degrees
  },
};
