export class SequentialExecutor {
  
  private executionList: ((resolve: (value: boolean) => void, reject: (reason?: any) => void) => void)[];
  private onFail : () => void;
  private onSuccess : () => void;
  private onAlways : () => void;

  SequentialExecutor() { }

  chain(executeThis?: (resolve: (value: boolean) => void, reject: (reason?: any) => void) => void): SequentialExecutor {
    this.executionList = [];
    if(executeThis) {
      return this.then(executeThis);
    } else {
      return this;
    }
  }

  parallel(executeThese: ((resolve: (value: boolean) => void, reject: (reason?: any) => void) => void)[]): SequentialExecutor {
    return this.then((res, rej) => {
      this.executeParallel(executeThese, 
        () => {
          res(true);
        },
        () => {
          rej("Parallel execution failed");
        }
      )
    });
  }

  then(executeThis: (resolve: (value: boolean) => void, reject: (reason?: any) => void) => void): SequentialExecutor {
    this.executionList.push(executeThis);
    return this;
  }

  fail(fail: (error?: any) => void) {
    this.onFail = fail;
    return this;
  }

  success(success: () => void) {
    this.onSuccess = success;
    return this;
  }

  always(always: () => void) {
    this.onAlways = always;
    return this;
  }
  
  execute() {
    this.executeInternal(this.executionList, this.onSuccess, this.onFail, this.onAlways);
  }

  private async executeInternal (
    executionList: ((resolve: (value: boolean) => void, reject: (reason?: any) => void) => void)[],
    onSuccess ?: () => void,
    onFail ?: (error?:any) => void,
    onAlways ?: () => void
  ) {

    let breakLoop = false;
    for (let index = 0; index < executionList.length; index++) {
      if(breakLoop) {
        break;
      }

      let execution = executionList[index];
      var synCaller = new Promise((resolve, reject) => {
        try {
          //console.log("executing", index+1);
          execution(resolve, reject);
        } catch(e) {
          reject(e.message);
        }
      });
  
      await synCaller.then(() => {
        //console.log("finished sequential", execution.toString(), index+1, "of", executionList.length)
        if(index == executionList.length - 1) {
          //console.log("done with sequential", index+1, executionList.length)
          if(onSuccess != undefined) {
            onSuccess();
          }
          if(onAlways != undefined) {
            onAlways();
          }
        }
      }).catch((error) => {
        console.log("error in sequential executor", error);
        if(onFail != undefined) {
          onFail(error);
        }
        if(onAlways != undefined) {
          onAlways();
        }
        //console.log("Sequential execution failed");
        breakLoop = true;
      });
    }
  }

  private executeParallel (
    executionList: ((resolve: (value: boolean) => void, reject: (reason?: any) => void) => void)[],
    onSuccess ?: () => void,
    onFail ?: () => void,
    onAlways ?: () => void
  ) {

    let finishedCount = 0;
    for (let index = 0; index < executionList.length; index++) {

      let execution = executionList[index];
      var synCaller = new Promise((resolve, reject) => {
        try {
          execution(resolve, reject); 
        } catch(e) {
          reject(e.message);
        }
      });
  
      synCaller.then(() => {
        finishedCount++;
        //console.log("\tfinished parallel", execution.toString(), finishedCount, "of", executionList.length)
        if(finishedCount == executionList.length) {
          //console.log("\tdone with parallel", finishedCount, executionList.length)
          if(onSuccess != undefined) {
            onSuccess();
          }
          if(onAlways != undefined) {
            onAlways();
          }
        }
      });

      synCaller.catch(() => {
        if(onFail != undefined) {
          onFail();
        }
        if(onAlways != undefined) {
          onAlways();
        }
        //console.log("Parallel execution failed");
      });
    }
  }
}