declare module '*.json' {
  const value: any;
  export default value;
}

declare module 'claudia-api-builder' {
  /*~ This declaration specifies that the class constructor function
   *~ is the exported object from the file
   */
  export = ApiBuilder;

  /*~ Write your module's methods and properties in this class */
  class ApiBuilder {
    constructor(options?: any);

    get(uri: string, callback: Function): void;
  }
}
