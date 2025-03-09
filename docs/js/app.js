
    const schema = {
  "asyncapi": "2.0.0",
  "info": {
    "title": "Simple Message API",
    "version": "1.0.0",
    "description": "A simple API compatible with older generator versions"
  },
  "channels": {
    "user/signup": {
      "subscribe": {
        "summary": "Receive information about user signup",
        "message": {
          "payload": {
            "type": "object",
            "properties": {
              "name": {
                "type": "string",
                "description": "Name of the user",
                "x-parser-schema-id": "<anonymous-schema-2>"
              },
              "email": {
                "type": "string",
                "format": "email",
                "description": "Email of the user",
                "x-parser-schema-id": "<anonymous-schema-3>"
              },
              "timestamp": {
                "type": "string",
                "format": "date-time",
                "description": "Signup timestamp",
                "x-parser-schema-id": "<anonymous-schema-4>"
              }
            },
            "x-parser-schema-id": "<anonymous-schema-1>"
          },
          "x-parser-message-name": "<anonymous-message-1>"
        }
      }
    },
    "user/logout": {
      "publish": {
        "summary": "Information about user logout",
        "message": {
          "payload": {
            "type": "object",
            "properties": {
              "userId": {
                "type": "string",
                "description": "ID of the user",
                "x-parser-schema-id": "<anonymous-schema-6>"
              },
              "timestamp": {
                "type": "string",
                "format": "date-time",
                "description": "Logout timestamp",
                "x-parser-schema-id": "<anonymous-schema-7>"
              }
            },
            "x-parser-schema-id": "<anonymous-schema-5>"
          },
          "x-parser-message-name": "<anonymous-message-2>"
        }
      }
    }
  },
  "x-asyncapi-cli": {
    "plugins": [
      {
        "name": "@asyncapi/html-template",
        "config": {
          "outFilename": "index.html",
          "templateParams": {
            "sidebarOrganization": "byTags"
          }
        }
      },
      {
        "name": "@asyncapi/markdown-template",
        "config": {
          "outFilename": "documentation.md"
        }
      },
      {
        "name": "@asyncapi/generator",
        "config": {
          "output": "./documentation",
          "forceWrite": true
        }
      },
      {
        "name": "@asyncapi/avro-schema-parser",
        "config": {
          "circularReferences": true
        }
      }
    ]
  },
  "x-parser-spec-parsed": true,
  "x-parser-api-version": 3,
  "x-parser-spec-stringified": true
};
    const config = {"show":{"sidebar":true},"sidebar":{"showOperations":"byDefault"}};
    const appRoot = document.getElementById('root');
    AsyncApiStandalone.render(
        { schema, config, }, appRoot
    );
  