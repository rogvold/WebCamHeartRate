/**
 * Created by Sasha on 17.03.2017.
 */


var Core = {

    initGPU: function(){
        this.gpu = new GPU({ loopMaxIterations: 100});

        this.mul_matrix_to_trans = this.gpu.createKernel(function(A, length) {
            var sum = 0;
            for (var i=0; i<length; i++) {
                sum += A[this.thread.y][i] * A[this.thread.x][i];
            }
            return sum;
        }).dimensions([3, 3]);
    },

    savedBazis: "",

    needToRefreshBazis: function( skinMatrix) {
        if ( typeof savedBazis == 'undefined' )
            return true
        if(savedBazis == "")
            return true

        return false;
    },


    saveBazis: function( skinMatrix) {
        savedBazis =  this.getPreparedEigens(skinMatrix);
    },

    calculateAngles: function( skinMatrix) {
        var   newBazis =  this.getPreparedEigens(skinMatrix);
        var R = this.getRresult(newBazis);
        var S = this.getSresult(newBazis);
        var SR = this.getSRresult(R, S);
        // return SR;
        // return S;
        return R;
    },


    getRresult: function( newBazis) {
        return[math.dot(newBazis[0],savedBazis[1]),
               math.dot(newBazis[0],savedBazis[2])]
    },

    getSresult: function( newBazis) {
        return[math.sqrt(newBazis[3][0] / savedBazis[3][1]),
               math.sqrt(newBazis[3][0] / savedBazis[3][2])]
    },

    getSRresult: function(R, S) {
        return[S[0]*R[0],
               S[1]*R[0]]
    },



    getPreparedEigens: function (skinMatrix) {

        var cc = +new Date();
     //   for (var i = 0; i < 30; i++) {

            var signatureMatrix = this.mulMatrix(skinMatrix)

            var eigenVectorsAndValues = this.findEig(signatureMatrix);

            this.makeMainEigenFirstone(skinMatrix, eigenVectorsAndValues);

     //   }



        var ttt = +new Date() - cc;
        console.log('time = ' + ttt + ' ms');
        var c=0;

        return eigenVectorsAndValues;
    },


    makeMainEigenFirstone: function (skinMatrix, eigenVectorsAndValues) {

        var deviations = [
            this.findDeviation(skinMatrix, 1000,eigenVectorsAndValues[0]),
            this.findDeviation(skinMatrix, 1000,eigenVectorsAndValues[1]),
            this.findDeviation(skinMatrix, 1000,eigenVectorsAndValues[2]) ];

    var minDevID = this.findMinDevID(deviations);
    this.swapEigenVectorsAndValues(minDevID, eigenVectorsAndValues);
    },

    findMinDevID: function (deviations) {
    var   minDevID = 0;
    if(deviations[1] < deviations[minDevID]) {
        minDevID = 1;
    }

    if(deviations[2] < deviations[minDevID]){
         minDevID = 2;
    }

    console.log('_____    ---- >>>> deviations = ', deviations);

     return   minDevID;
    },

    swapEigenVectorsAndValues: function (minDevID, eigenVectorsAndValues) {
        if(minDevID != 0) {
            var obj1 = {a: eigenVectorsAndValues[0], b: eigenVectorsAndValues[minDevID]};
            eigenVectorsAndValues[0] = obj1.b;
            eigenVectorsAndValues[minDevID] = obj1.a;


            obj1 = {a: eigenVectorsAndValues[3][0], b: eigenVectorsAndValues[3][minDevID]};
            eigenVectorsAndValues[3][0] = obj1.b;
            eigenVectorsAndValues[3][minDevID] = obj1.a;

//             this.swap(eigenVectorsAndValues[0], eigenVectorsAndValues[minDevID]);
  //          this.swap(eigenVectorsAndValues[3][0], eigenVectorsAndValues[3][minDevID]);
        }

    },


    mulMatrix: function (A) {

        var matrix = this.mul_matrix_to_trans(A, A[0].length);
        var normaled_matrix = numeric.mul(matrix, 1.0 / A[0].length);
        return normaled_matrix;
    },


    findEig: function (A) {
        var A_preparation_1 = [A[0][0], A[0][1], A[0][2],
                  A[1][0], A[1][1], A[1][2],
                  A[2][0], A[2][1], A[2][2]];

        var A_preparation_2  = new jsfeat.data_t(4*9, A_preparation_1);

        var matrix = new jsfeat.matrix_t(3, 3, jsfeat.F32_t | jsfeat.C3_t, A_preparation_2);

        var eigenvectors = new jsfeat.matrix_t(3, 3, jsfeat.F32_t | jsfeat.C3_t, data_buffer= undefined);
        var eigenvalues = new jsfeat.matrix_t(3, 1, jsfeat.F32_t | jsfeat.C3_t, data_buffer = undefined);

         jsfeat.linalg.eigenVV(matrix, eigenvectors, eigenvalues);
         var result = [
             [eigenvectors.data[0], eigenvectors.data[1], eigenvectors.data[2]],
             [eigenvectors.data[3], eigenvectors.data[4], eigenvectors.data[5]],
             [eigenvectors.data[6], eigenvectors.data[7], eigenvectors.data[8]],
             [eigenvalues.data[0], eigenvalues.data[1], eigenvalues.data[2]]
         ]
        return result;
    },

    findDeviation: function (skinMatrix, dostQuantity, vector) {
        var shift = Math.floor(skinMatrix[0].length / dostQuantity);
        if(shift < 1)
           shift = 1;

        var sum = 0;

        var line = [0, 0, 0, vector[0], vector[1], vector[2]];
        for(var i = 0; i < skinMatrix[0].length; i+= shift) {
            var distance = math.distance([skinMatrix[0][i], skinMatrix[1][i], skinMatrix[2][i]], line);
            sum += distance*distance;
        }
        var deviation = math.sqrt( sum / dostQuantity);
        return deviation
    }


}