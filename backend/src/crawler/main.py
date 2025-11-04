# 파이프라인 실행
from crawl_tools import CrawlTools

def main():
    crawl_tools = CrawlTools()
    crawl_tools.run_pipeline(max_pages=1)

if __name__ == "__main__":
    main()