'use strict';

/* Patient model (Smart interface)
Note that there are no dependencies for this module (as it should be)
*/
var DMPatientServices = angular.module('DM.PatientServices', []);

DMPatientServices.factory('$dmPatient', function () {
    return {
        patient: {},
        get_demographics: function (smart) {
            var patient = this.patient;
            return $.Deferred(function (dfd) {
            
                smart.context.patient.read().done(function (p) {
                    patient.familyName = p.name[0].family.join(" ");
                    patient.givenName = p.name[0].given.join(" ");
                    patient.gender = (p.gender.coding[0].code == 'M') ? 'male' : 'female';
                    patient.bday = p.birthDate;
                    dfd.resolve();
                }).fail(function(e) {
                    dfd.reject(e.message);
                });
            }).promise();
        },

        get_medications: function (smart) {
            var patient = this.patient;
            return $.Deferred(function (dfd) {
                patient.medicines = [];

                var allMeds = [];
                
                smart.context.patient.MedicationPrescription.where.drain(drainMeds).done(doneMeds);

                function drainMeds(ms){
                  [].push.apply(allMeds, ms); 
                };

                function doneMeds(){
                    $.each(allMeds, function (idx, med) {
                        var m = med.contained[0];
                        var c = m.code.coding[0];
                        var inst = med.dosageInstruction[0];
                        var startDate = inst.timingSchedule.event[0].start;
                        // TO DO: need to verify that c.system is RXNORM
                        
                        patient.medicines.push({ "rxCui": c.code, "rxName": m.name, "ins": inst.text, "startDate": startDate });
                    });
                
                    patient.medicines = _(patient.medicines).chain().sortBy(function (p) {
                        return p.rxName.toLowerCase();
                    }).map(function (med) {
                        var a = med.rxName.split(' ');
                        med.rxName = a[0];
                        med.strengthAndDoseForm = _(a).rest().join(' ');
                        return med;
                    }).value();

                    dfd.resolve();
                };

            }).promise();
        },

        get_problems: function (smart) {
            var patient = this.patient;
            return $.Deferred(function (dfd) {
                patient.problems = [];

                var allProblems = [];

                smart.context.patient.Condition.where.drain(drainProblems).done(doneProblems);

                function drainProblems(ps){
                  [].push.apply(allProblems, ps); 
                };

                function doneProblems(){
                    $.each(allProblems, function (idx, p) {
                        var c = p.code.coding[0];
                        // TO DO: need to verify that c.system is SNOMEDCT

                        var problem = { "CID": c.code, "name": p.code.text };
                        var title = problem.name;
                        // THIS WILL BE A SEMANTIC SERVER FUNCTION (?)
                        if ((title.match(/heart disease/i)) || (title.match(/Congestive Heart Failure/i)) || (title.match(/Myocardial Infarction/i))
                            || (title.match(/Cerebrovascular Disease /i)) || (title.match(/Hypertension/i)) || (title.match(/neuropathic pain/i))
                            || (title.match(/coronary arteriosclerosis/i)) || (title.match(/chronic renal impariment/i)) || (title.match(/cardiac bypass graft surgery/i))
                            || (title.match(/Preinfarction syndrome/i)) || (title.match(/Chest pain/i)) || (title.match(/Chronic ischemic heart disease/i))
                            || (title.match(/Disorder of cardiovascular system/i)) || (title.match(/Precordial pain/i)))
                            problem.category = "CoMorbidity";
                        else
                            problem.category = "Normal";
                        problem.startDate = "...";
                        patient.problems.push(problem);
                    });
                
                    patient.problems = _(patient.problems).sortBy(function (p) {
                        return p.problemName;
                    })

                    dfd.resolve();
                };
            }).promise();
        },

        get_allergies: function (smart) {
            var patient = this.patient;
            return $.Deferred(function (dfd) {
                patient.allergies = [];
                
                var allAllergies = [];

                smart.context.patient.AllergyIntolerance.where.drain(drainAllergies).done(doneAllergies);

                function drainAllergies(as){
                  [].push.apply(allAllergies, as); 
                };
                
                function doneAllergies(){
                    $.each(allAllergies, function (idx, a) {
                        //var c = p.code.coding[0];
                        // TO DO: need to verify that c.system is SNOMEDCT

                        /*
                        var allergen = a.drugClassAllergen || a.foodAllergen;
                        if (allergen) {
                            allergy = { "allergen": "...", "reaction": "..." };
                            patient.allergies.push(allergy);
                        }
                        */
                    });

                    dfd.resolve();
                };
            }).promise();
        },
        
        get_lab_results: function (smart) {
            var patient = this.patient;
            return $.Deferred(function (dfd) {
                patient.labs = [];
                
                var allLabs = [];
                
                // TO DO: This should use a semantic service
                smart.context.patient.Observation.where.nameIn(["2085-9","17861-6","1968-7","13457-7","3094-0","2571-8","2093-3","2345-7","1975-2","2160-0","1742-6","2823-3","2075-0","2028-9","1920-8","2951-2","6768-6","2885-2","1751-7","1971-1","9842-6","5811-5","5803-2","5804-0","5794-3","5770-3","20453-7","26515-7","30428-7","770-8","5802-4","30385-9","2157-6","5821-4","13945-1","26464-8","789-8","26478-8","26485-3","26450-7","30180-4","718-7","8247-9","5769-5","785-6","786-4","30522-7","10466-1","28542-9","5796-8","12258-0","11580-8","5767-9","1648-5","6298-4","2339-0","6299-2","38483-4","20509-6","20570-8","2069-3","26511-6","735-1","26508-2","5799-2","2857-1","4548-4","3040-3","10839-9","3084-1","18262-6","9318-7","3024-7","3051-0","33903-6","18282-4","19161-9","19659-2","3879-4","3397-7","3377-9","3349-8","681-7","20473-5","19123-9","1558-6","31100-1","2947-0","30089-7","13969-1","20569-0","741-9","738-5","26486-1","2342-4","2880-3","10378-8","802-9","26498-6","9317-9","3298-7","11555-0","6742-1","20512-0","1841-6","10335-8","7791-7","2614-6","806-0","26454-9","10328-3","4024-6","11558-4","11557-6","11556-8","1959-6","20563-3","2713-6","2143-6","2158-4","1863-0","2777-1","4092-3","30934-4","3184-9","2284-8","20565-8","19048-8","774-0","800-3","38478-4","29571-7","2106-3","49220-7","32215-6","2692-2","2524-7","14627-4","19080-1","2746-6","2986-8","13955-0","5792-7","21416-3","34708-8","4544-3","1989-3","14957-5","54434-6","43727-7","43729-3","62255-5","19869-7","20149-1","19925-7","69971-0","19877-0","20157-4","19926-5","69972-8","19874-7","20155-8","69970-2","69973-6","21414-8","21189-6","62461-9","14370-1","69571-8","41935-8","71850-2","2091-7","68954-7","2075--0","2498-4","2500-7","2501-5","2502-3","2276-4","16128-1","2132-9","7917-8","20507-0","44009-9","10900-9","30341-2","5047-6","11572-5","14914-6","37362-1"]).drain(drainlabs).done(doneLabs);

                function drainlabs(ls){
                  [].push.apply(allLabs, ls); 
                };

                function doneLabs(){
                    // TO DO: verify that coding system is LOINC
                    _(allLabs).chain().sortBy(function (l) {
                        return l.name.coding[0].display;
                    }).each(function (l) {
                        if (l.valueQuantity) {
                            var data = [];
                            var d = new XDate(l.appliesDateTime).addYears(4, true);
                            var flag = Number(l.valueQuantity.value) <= Number(l.referenceRange[0].low.value) || Number(l.valueQuantity.value) >= Number(l.referenceRange[0].high.value);
                            data.push({ "shortdate": d.toString('MM/dd/yy'), "date": d.toString('MM/dd/yyyy'), "value": l.valueQuantity.value, "flag": flag });

                            var lab = _.find(patient.labs, function (lab) {
                                return lab.loinc == l.name.coding[0].code;
                            });
                            if (lab) {
                                flag = Number(l.valueQuantity.value) <= Number(lab.min) || Number(l.valueQuantity.value) >= Number(lab.max);
                                lab.data.push({ "shortdate": d.toString('MM/dd/yy'), "date": d.toString('MM/dd/yyyy'), "value": l.valueQuantity.value, "flag": flag });
                            }
                            else {
                                lab = {
                                    "loinc": l.name.coding[0].code,
                                    "name": l.name.coding[0].display,
                                    "units": l.valueQuantity.units,
                                    "range": l.referenceRange[0].low.value + "-" + l.referenceRange[0].high.value,
                                    "min": l.referenceRange[0].low.value,
                                    "max": l.referenceRange[0].high.value,
                                    "data": data

                                };
                                patient.labs.push(lab);
                            }
                        } 
                    }).value();
                    dfd.resolve();
                };
            }).promise();
        },

        get_vital_sign_sets: function (smart) {
            var patient = this.patient;
            return $.Deferred(function(dfd) {
                patient.vitals = [];
                
                var allVitals = [];
                
                smart.context.patient.Observation.where.nameIn(['8302-2','3141-9','8480-6','8462-4']).drain(drainVitals).done(doneVitals);

                function drainVitals(vs){
                  [].push.apply(allVitals, vs); 
                };

                function doneVitals(){
                    (function bpsys() {
                        var data = _(allVitals).chain()
                        .filter(function (v) {
                            return v.name.coding[0].code == "8480-6";
                        })
                        .map(function (v) {
                            var d = new XDate(v.appliesDateTime).addYears(3, true);
                            return {
                                "date": d.toString('MM/dd/yyyy'),
                                "value":Number(v.valueQuantity.value)
                                 
                            };
                        }).value()
                       
                        patient.vitals.push({ "name": "bloodPressure", "subName": "systolic", "units": "mm[Hg]", "data":data });
                    })();
                    
                    (function bpdia() {
                        var data = _(allVitals).chain()
                        .filter(function (v) {
                            return v.name.coding[0].code == "8462-4";
                        })
                        .map(function (v) {
                            var d = new XDate(v.appliesDateTime).addYears(3, true);
                            return {
                                "date": d.toString('MM/dd/yyyy'),
                                "value": Number(v.valueQuantity.value)
                                 
                            };
                        }).value()

                        patient.vitals.push({ "name": "bloodPressure", "subName": "diastolic", "units": "mm[Hg]", "data": data });
                    })();
                    
                    (function weights() {
                        var units;
                        var data = _(allVitals).chain()
                           
                        .filter(function (v) {
                            return v.name.coding[0].code == "3141-9";
                        })
                        .sortBy(function (v) {
                            return v.appliesDateTime || null
                        })
                            
                        .map(function(v) {
                            var d = new XDate(v.appliesDateTime).addYears(3, true);
                            units = v.valueQuantity.units;
                            return {
                                "date": d.toString('MM/dd/yyyy'),
                                "value": (v.valueQuantity.value)
                                 
                            };
                        }).value()
                        patient.vitals.push({ "name": "weight", "units": units, "data": data });
                    })();
                    
                    (function heights() {
                        var units;
                        var data = _(allVitals).chain()
                            
                        .filter(function (v) {
                            return v.name.coding[0].code == "8302-2";
                        })
                        .sortBy(function (v) {
                            return v.appliesDateTime || null
                        })
                            
                        .map(function (v) {
                            var d = new XDate(v.appliesDateTime).addYears(3, true);
                            units = v.valueQuantity.units;
                            return {
                                "date": d.toString('MM/dd/yyyy'),
                                "value": Number(v.valueQuantity.value)

                            };
                        }).value()
                        patient.vitals.push({ "name": "height", "units": units, "data": data });
                    })();
                        
                    dfd.resolve();
                };
            }).promise();
        },

        // PATIENT SCHEMA AND TEST DATA FOR OUT-OF-CONTAINER DEVELOPMENT 
        getFromJSON: function () {
            this.patient = {
                "medicalRecordNumber": 34,
                "givenName": "William",
                "familyName": "Robinson",
                "bday": "1965-08-09",
                "age": "47",
                "gender": "M",
                "medicines":[
                    { "rxCui": "197381", "rxName": "Atenolol", "strengthAndDoseForm": "50 MG Oral Tablet", "ins": "1 daily", "startDate": "2012-08-20" },
                    { "rxCui": "213469", "rxName": "Celecoxib", "strengthAndDoseForm": "200 MG Oral Capsule [Celebrex]", "ins": "1 daily", "startDate": "2012-08-19" },
                    { "rxCui": "795735", "rxName": "Chantix", "strengthAndDoseForm": "Continuing Months Of Therapy Pack", "ins": "1 daily", "startDate": "2012-08-18" },
                    { "rxCui": "259543", "rxName": "Clarithromycin", "strengthAndDoseForm": "500 MG Extended Release Tablet", "ins": "1 bid", "startDate": "2012-08-17" },
                    { "rxCui": "213169", "rxName": "Clopidogrel", "strengthAndDoseForm": "75 MG Oral Tablet [Plavix]", "ins": "1 daily", "startDate": "2012-08-16" },
                    { "rxCui": "199026", "rxName": "Doxycycline ", "strengthAndDoseForm": "100 MG Oral Capsule", "ins": "1 bid", "startDate": "2012-08-15" },
                    { "rxCui": "199247", "rxName": "Glimepiride ", "strengthAndDoseForm": "4 MG Oral Tablet", "ins": "1 daily", "startDate": "2012-08-14" },
                    { "rxCui": "860981", "rxName": "Metformin", "strengthAndDoseForm": "750 MG Extended Release Tablet", "ins": "1 bid", "startDate": "2012-08-13" },
                    { "rxCui": "1098135", "rxName": "Niacin", "strengthAndDoseForm": "1000 MG Extended Release Tablet [Niaspan]", "ins": "1 qhs", "startDate": "2012-08-12" },
                    { "rxCui": "198039", "rxName": "Nitroglycerin", "strengthAndDoseForm": "0.4 MG Sublingual Tablet", "ins": "1 sl q5min x3 prn angina", "startDate": "2012-08-11" },
                    { "rxCui": "314200", "rxName": "Pantoprazole", "strengthAndDoseForm": "40 MG Enteric Coated Tablet", "ins": "1 daily", "startDate": "2012-08-10" },
                    { "rxCui": "859046", "rxName": "Pramipexole", "strengthAndDoseForm": "0.5 MG Oral Tablet [Mirapex]", "ins": "1 tid", "startDate": "2012-08-09" },
                    { "rxCui": "260333", "rxName": "Ramipril", "strengthAndDoseForm": "10 MG Oral Capsule [Altace]", "ins": "1 daily", "startDate": "2012-08-08" },
                    { "rxCui": "859749", "rxName": "Rosuvastatin", "strengthAndDoseForm": "10 MG Oral Tablet [Crestor]", "ins": "1 qhs", "startDate": "2012-08-07" },
                    { "rxCui": "198211", "rxName": "Simvastatin", "strengthAndDoseForm": "40 MG Oral Tablet", "ins": "1 qhs", "startDate": "2012-08-06" }
                ],
                "problems":[
                    { "CID": "1201005", "name": "Benign essential hypertension", "category": "Normal", startDate: '1/1/2000' },
                    { "CID": "29857009", "name": "Chest pain", "category": "Normal", startDate: '1/1/2000' },
                    { "CID": "429673002", "name": "Coronary arteriosclerosis", "category": "Normal", startDate: '1/1/2000' },
                    { "CID": "59621000", "name": "Essential hypertension", "category": "Normal", startDate: '1/1/2000' },
                    { "CID": "4557003", "name": "Preinfarction syndrome", "category": "Normal", startDate: '1/1/2000' },
                    { "CID": "195967001", "name": "Asthma", "category": "Normal", startDate: '1/1/2000' },
                    { "CID": "44054006", "name": "Diabetes mellitus type 2", "category": "Normal", startDate: '1/1/2000' },
                    { "CID": "55822004", "name": "Hyperlipidemia", "category": "Normal", startDate: '1/1/2000' },
                    { "CID": "43339004", "name": "Hypokalemia", "category": "Normal", startDate: '1/1/2000' },
                    { "CID": "185903001", "name": "Needs influenza immunization", "category": "Normal", startDate: '1/1/2000' },
                    { "CID": "267432004", "name": "Pure hypercholesterolemia", "category": "Normal", startDate: '1/1/2000' },
                    { "CID": "73430006", "name": "Unspecified sleep apnea", "category": "Normal", startDate: '1/1/2000' },
                    { "CID": "4557003", "name": "Preinfarction syndrome", "category": "Normal", startDate: '1/1/2000' },
                ],
                "allergies":[
                    { "allergen": "Soap", "reaction": "Skin rash" }

                ],

                "otherinfo":[
                    { "date": "-", "name": "Foot exam", "value": "", "units": "" },
                    { "date": "-", "name": "Eye exam", "value": "", "units": "" },
                    { "date": "-", "name": "Tobacco", "value": "Smoker", "units": "" },
                    { "date": "-", "name": "Aspirin", "value": "", "units": "" },
                    { "date": "-", "name": "ACE/ARB", "value": "", "units": "" },
                    { "date": "-", "name": "Last pneumovax", "value": "", "units": "" },
                    { "date": "05/12/2012", "name": "Last flu shot", "value": "", "units": "" }
                ],
                "vaccinations":[

                    { "date": "Unknown", "name": "last pneumovax", "value": "", "units": "" },
                    { "date": "Unknown", "name": "last flu shot", "value": "", "units": "" }
                ],
                "reminders":[
                    {
                        "title_html": "glycemia",
                        "reminder_html": "Consider checking A1C today",
                        "reminder_for_pt_html": "Find out how to lower your A1C to control your blood sugar today",
                        "lab_variable": "",
                        "lab_name_html": "A1C",
                        "target_min": 0,
                        "target_max": 7,
                        "target_unit": "%",
                        "target_range_text_html": "&lt; 7%",
                        "overdue_in_months": 6,
                        "extra_info_html": null
                    },{
                        "title_html": "lipids",
                        "reminder_html": "Consider checking lipids today",
                        "reminder_for_pt_html": "Find out how to lower your LDL levels today",
                        "lab_variable": "",
                        "lab_name_html": "LDL",
                        "target_min": 0,
                        "target_max": 100,
                        "target_unit": "mg/dL",
                        "target_range_text_html": "&lt; 100mg/dL",
                        "overdue_in_months": 6,
                        "extra_info_html": "Consider more aggressive target of &lt; 70 (established CAD)."
                    },{
                        "title_html": "albuminuria",
                        "reminder_html": "Consider checking urine &micro;alb/cre ratio today",
                        "lab_variable": "",
                        "lab_name_html": "urine &alb/cre ratio",
                        "target_min": 0,
                        "target_max": 30,
                        "target_unit": "mg/g",
                        "target_range_text_html": "&lt; 30",
                        "overdue_in_months": 6,
                        "extra_info_html": "&micro;alb/cre ratio test preferred over non-ratio &micro;alp screening tests."
                    }
                ],

                "vitals":[
                    {
                        "name": "heartRate", "units": "{beats}/min", "data": [
                            { "date": "10/24/2011", "value": "60" }, { "date": "10/24/2010", "value": "66" }
                        ]
                    },{
                        "name": "bloodPressure", "subName": "diastolic", "units": "mm[Hg]", "data": [
                            { "date": "10/24/2011", "value": "86" }, { "date": "12/12/2012", "value": "92" }
                        ]
                    },{
                        "name": "bloodPressure", "subName": "systolic", "units": "mm[Hg]", "data": [
                            { "date": "10/24/2011", "value": "128" }, { "date": "12/12/2012", "value": "126" }
                        ]
                    },{
                        "name": "weight", "units": "lb", "data": [
                            { "date": "10/24/2011", "value": "182" }, { "date": "12/12/2012", "value": "180" }
                        ]
                    },{
                        "name": "height", "units": "in", "data": [
                            { "date": "10/24/2011", "value": "72" }, { "date": "12/12/2012", "value": "72" }
                        ]
                    }

                ],
                "labs":[
                    {
                        "loinc": "5804-0", "name": "Ur tp", "units": "", "range": "0-135", "data": [
                            { "date": "10/24/2011", "value": "2" }, { "date": "8/22/2010", "value": "3" }
                        ]
                    },{
                        "loinc": "14959-1", "name": "ualb/cre", "units": "", "range": "< 30.0", "data": [
                            { "date": "10/24/2011", "value": "2" }, { "date": "8/22/2010", "value": "3" }
                        ]
                    },{
                        "loinc": "3094-0", "name": "BUN", "units": "mg/dL", "range": "8%-25%", "data": [
                            { "date": "10/24/2011", "value": "15" }, { "date": "01/05/2011", "value": "11" }
                        ]
                    },{
                        "loinc": "2160-0", "name": "Cre", "units": "mg/dL", "range": "0.6-1.5", "data": [
                            { "date": "10/24/2011", "value": "0.84" }, { "date": "01/05/2011", "value": "0.8" }
                        ]
                    },{
                        "loinc": "1920-8", "name": "SGOT", "units": "U/L", "range": "10-40", "data": [
                            { "date": "10/24/2011", "value": "27" }, { "date": "01/05/2011", "value": "33" }
                        ]
                    },{
                        "loinc": "2093-3", "name": "Chol", "units": "", "range": "< 200", "data": [
                            { "date": "10/24/2011", "value": "44" }, { "date": "8/22/2010", "value": "54" }
                        ]
                    },{
                        "loinc": "2571-8", "name": "Tri", "units": "mg/dL", "range": "< 150", "data": [
                            { "date": "10/24/2011", "value": "232"}, { "date": "03/16/2011", "value": "100" }
                        ]
                    },{
                        "loinc": "2085-9", "name": "HDL", "units": "mg/dL", "range": "> 40", "data": [
                            { "date": "10/24/2011", "value": "33"}, { "date": "03/16/2011", "value": "32" }
                        ]
                    },{
                        "loinc": "13457-7", "name": "LDL", "units": "mg/dL", "range": "< 100", "data": [

                            { "date": "10/24/2009", "value": "69" },
                            { "date": "03/16/2011", "value": "72" },
                            { "date": "12/16/2010", "value": "55" }
                        ]
                    },{
                        "loinc": "2345-7", "name": "Glu", "units": "mg/dL", "range": "70-110", "data": [
                            { "date": "10/24/2011", "value": "256" },
                                 
                            { "date": "1/05/2011", "value": "148" },
                        ]
                    },{
                        "loinc": "4548-4", "name": "A1C", "units": "%", "range": "< 7%", "data": [
                            { "date": "02/14/2012", "value": "8.6" },
                            { "date": "10/24/2011", "value": "10.4" }
                        ]
                    }
                ]

            };
            _.each(this.patient.labs, function (l) {
                _.each(l.data, function (r) {
                    var d = new XDate(r.date);
                    r.shortdate = d.toString('MM/dd/yy');
                });
            });
            var _flot_opts = {
                xaxis: {
                    mode: 'time',
                    timeformat: '%y',
                    min: new XDate(2009, 11).valueOf(),
                    max: new XDate().valueOf(),
                    tickSize: [1, 'year'],
                    minTickSize: [1, 'year']
                },
                series: {
                    lines: { show: false },
                    points: { show: true }
                },
                grid: {
                    backgroundColor: 'white',
                    borderWidth: 1
                }
            };

            this.patient.ldl_flot_opts = {};
            $.extend(true, this.patient.ldl_flot_opts, _flot_opts, {
                yaxis: { min: 0, max: 200, ticks: [0, 50, 100, 150, 200], tickLength: 0 },
                grid: { markings: [{ yaxis: { from: 200, to: 100 }, color: "#eee" }] }
            });
            this.patient.a1c_flot_opts = {};
            $.extend(true, this.patient.a1c_flot_opts, _flot_opts, {
                yaxis: { min: 0, max: 20, ticks: [0, 5, 10, 15, 20], tickLength: 0 },
                grid: { markings: [{ yaxis: { from: 7, to: 20 }, color: "#eee" }] }
            });
            this.patient.bp_flot_opts = {};
            $.extend(true, this.patient.bp_flot_opts, _flot_opts, {
                yaxis: { min: 50, max: 200, ticks: [50, 100, 150, 200], tickLength: 0 },
                grid: {
                    markings: [
                        { yaxis: { from: 0, to: 80 }, color: "#eee" },
                        { yaxis: { from: 200, to: 130 }, color: "#eee" }
                    ]
                }
            });
        }

    }
});
