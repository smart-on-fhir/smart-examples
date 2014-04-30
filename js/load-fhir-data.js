(function(){
  FhirLoader = {};

  FhirLoader.demographics = function() {
    var dfd = $.Deferred();
    smart.Patient.read().done(function(patient) {

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
    return getObservations().pipe(processObservations);
  }

  function processObservations(db){
    var vitals = {heightData: [], bpData: []};

    var vitalsByCode = smart.byCode(db.observations, 'name');

    (vitalsByCode['8302-2']||[]).forEach(function(v){
      vitals.heightData.push({
        vital_date: v.appliesDateTime,
        height: smart.units.cm(v.valueQuantity)
      }); 
    });

    (vitalsByCode['55284-4']||[]).forEach(function(v){

      var components = smart.byCode(v.related.map(function(c){
        return smart.followSync(v, c.target);
      }), 'name');

      var diastolicObs = components["8480-6"][0];
      var systolicObs = components["8462-4"][0];
      var systolic = systolicObs.valueQuantity.value;
      var diastolic = diastolicObs.valueQuantity.value;

      vitals.bpData.push({
        vital_date: v.appliesDateTime,
        systolic: systolic,
        diastolic: diastolic
      }); 
    });

    return vitals;
  };

  function getObservations(db){
    db = db || {};
    var loincs = ['8480-6','8462-4','8302-2','55284-4'];
    return smart.Observation.where.nameIn(loincs)
    .drain(function(vs, db){
      db.observations = (db.observations || []); 
      [].push.apply(db.observations, vs)
    }, db);
  };  

})();
