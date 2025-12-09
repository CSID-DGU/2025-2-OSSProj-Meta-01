"""
MongoDB 연결 후 doc_id 한 건만 JSON으로 반환하는 헬퍼 클래스.
"""

import json
import os
from typing import Any, Dict, Optional

from bson import ObjectId
from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.collection import Collection

load_dotenv()


class ScholarshipDocumentFetcher:
    """`scholarship_processed` 컬렉션에서 doc_id로 문서를 조회하는 클래스."""

    def __init__(self, mongo_config: Optional[Dict[str, Any]] = None):
        self.mongo_config = mongo_config or {
            "host": os.getenv("MONGO_HOST", "localhost"),
            "port": int(os.getenv("MONGO_PORT", 27017)),
            "user": os.getenv("MONGO_USER", "admin"),
            "password": os.getenv("MONGO_PASSWORD", "admin123"),
            "database": os.getenv("MONGO_DATABASE", "dongguk_db"),
        }

        connection_string = (
            f"mongodb://{self.mongo_config['user']}:{self.mongo_config['password']}"
            f"@{self.mongo_config['host']}:{self.mongo_config['port']}/"
        )
        self.client = MongoClient(connection_string)
        self.collection: Collection = self.client[self.mongo_config["database"]]["scholarships_processed"]

    def get_document(self, doc_id: str) -> str:
        """
        doc_id(글번호) 기반으로 한 건의 문서를 JSON 문자열로 반환.
        찾지 못하면 "{}" 반환.
        """
        filter_candidates = []
        try:
            filter_candidates.append({"_id": ObjectId(doc_id)})
        except Exception:
            pass

        # 크롤링 시 저장된 글번호 필드
        filter_candidates.append({"글번호": doc_id})
        # 기타 백업 필드들
        filter_candidates.append({"doc_id": doc_id})
        filter_candidates.append({"id": doc_id})

        document: Optional[Dict[str, Any]] = None
        for filter_query in filter_candidates:
            document = self.collection.find_one(filter_query)
            if document:
                break

        if not document:
            return "{}"

        if "_id" in document and isinstance(document["_id"], ObjectId):
            document["_id"] = str(document["_id"])

        return json.dumps(document, ensure_ascii=False)

    def close(self) -> None:
        """MongoDB 연결 해제."""
        self.client.close()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()
    
    def search_documents(self, keyword: str):
        pipeline = [
        {
            "$project": {
                "_id": 1,
                "kv": {"$objectToArray": "$$ROOT"}
            }
        },
        {
            "$project": {
                "_id": 1,
                "fullText": {
                    "$reduce": {
                        "input": "$kv",
                        "initialValue": "",
                        "in": {
                            "$concat": [
                                "$$value",
                                " ",
                                {
                                    "$switch": {
                                        "branches": [
                                            {
                                                "case": { "$eq": [ { "$type": "$$this.v" }, "objectId" ] },
                                                "then": ""
                                            },
                                            {
                                                "case": { "$in": [ { "$type": "$$this.v" }, ["int", "long", "double"] ] },
                                                "then": { "$toString": "$$this.v" }
                                            },
                                            {
                                                "case": { "$eq": [ { "$type": "$$this.v" }, "bool" ] },
                                                "then": { "$toString": "$$this.v" }
                                            },
                                            {
                                                "case": { "$eq": [ { "$type": "$$this.v" }, "array" ] },
                                                "then": {
                                                    "$reduce": {
                                                        "input": "$$this.v",
                                                        "initialValue": "",
                                                        "in": {
                                                            "$concat": [
                                                                "$$value",
                                                                " ",
                                                                {
                                                                    "$cond": [
                                                                        { "$eq": [ { "$type": "$$this" }, "string" ] },
                                                                        "$$this",
                                                                        ""
                                                                    ]
                                                                }
                                                            ]
                                                        }
                                                    }
                                                }
                                            },
                                            {
                                                "case": { "$eq": [ { "$type": "$$this.v" }, "string" ] },
                                                "then": "$$this.v"
                                            }
                                        ],
                                        "default": ""
                                    }
                                }
                            ]
                        }
                    }
                }
            }
        },
        {
            "$match": {
                "fullText": { "$regex": keyword, "$options": "i" }
            }
        }
    ]

        cursor = self.collection.aggregate(pipeline)

        searched_id = []
        for doc in cursor:
            if "_id" in doc:
                searched_id.append(str(doc["_id"]))

        return searched_id
