(function(){
  FhirLoader = {};

  FhirLoader.demographics = function() {
    var dfd = $.Deferred();
    fhirClient.get({
      resource: 'Patient',
      id: fhirClient.patientId
    }).done(function(patient) {

      var name = patient.name[0].given.join(" ") +" "+ patient.name[0].family.join(" ");
      var birthday = new Date(patient.birthDate).toISOString();
      var gender = patient.gender.coding[0];

      dfd.resolve({
        name: name,
        gender: gender.code == 'M' ? 'male' : 'female',
        birthday: birthday
      });

    }).fail(function(e) {
      dfd.reject(e.message);
    });
    return dfd.promise();
  };

  FhirLoader.vitals = function() {
    return getLists()
    .pipe(getObservations())
    .pipe(processObservations);
  }

  function processObservations(db){
    var vitals = {heightData: [], bpData: []};
    var vitalsByCode = fhirClient.byCode(db.observations, 'name');
    (vitalsByCode['8302-2']||[]).forEach(function(v){
      vitals.heightData.push({
        vital_date: v.appliesDateTime,
        height: fhirClient.units.cm(v.valueQuantity)
      }); 
    });

    (vitalsByCode['8480-6']||[]).forEach(function(v){

      var diastolicObs = partner(db.lists, v.resourceId, "8462-4")[0];
      var systolic = v.valueQuantity.value;
      var diastolic = diastolicObs.valueQuantity.value;

      vitals.bpData.push({
        vital_date: v.appliesDateTime,
        systolic: systolic,
        diastolic: diastolic
      }); 

    });

    return vitals;
  };

  function drain(search, batch){
    return function(db) {
      var d = $.Deferred();
      db = db || {};
      fhirClient.search(search)
      .done(function drain(vs, cursor){
        batch(vs, db);
        if (cursor.hasNext()){
          cursor.next().done(drain);
        } else {
          d.resolve(db)
        } 
      });
      return d.promise();
    };
  };

  function getLists(db){
    return drain({
      resource: 'List',
      searchTerms: {
        'subject:Patient': fhirClient.patientId,
        'code' : '55284-4' // Loinc code for BP (Sys + Dia)
      }
    }, function(vs, db){
      vs.forEach(function(v){
        var obsGroup = v.entry.map(function(i){ return i.item.reference; });
        v.entry.forEach(function(i){
          db.lists=(db.lists || {});
          db.lists[i.item.reference] = obsGroup;
        });
      });
    })(db);
  };

  function getObservations(db){
    return drain({
      resource: 'Observation',
      searchTerms: {
        'subject:Patient':fhirClient.patientId,
        'name' : '8480-6,8462-4,8302-2'  // sbp, dbp, height
      }
    }, function(vs, db){
      db.observations = (db.observations || []); 
      [].push.apply(db.observations, vs)
    });
  };  

  function partner(lists, anchor, target){
    var anchorId = anchor.resource+"/"+anchor.id;
    return lists[anchorId].map(function(i){
      return fhirClient.resources.get(i);
    }).filter(function(d){
      return d.name.coding.map(function(c){return c.code;}).indexOf(target)  !== -1;
    });
  };

})();
