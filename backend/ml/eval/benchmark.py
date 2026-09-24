import time
def benchmark(n=10000):
    t=time.perf_counter()
    for _ in range(n): pass
    return {"iterations":n,"seconds":time.perf_counter()-t}
if __name__=="__main__": print(benchmark())
