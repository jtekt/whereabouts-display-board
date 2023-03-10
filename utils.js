exports.get_id_of_item = (item) =>
  item._id || item.properties._id || item.identity.low || item.identity
